import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { dec, money, moneyString } from "@/lib/money";
import { makeReference } from "@/lib/utils";
import { findApplicableCharge } from "@/lib/charges";

type PosInput = {
  category: "POS_SERVICE" | "GAS_PAYMENT";
  service?: "CASH_WITHDRAWAL" | "CARD_WITHDRAWAL" | "CASH_DEPOSIT" | "TRANSFER" | "AIRTIME" | "DATA";
  amount: number;
  paymentMethod?: "CASH" | "TRANSFER" | "CARD";
  note?: string;
  debtId?: string;
};

export async function createPosTransaction(input: PosInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    if (!input.paymentMethod) throw new Error("VALIDATION:Choose the payment method.");
    const amount = money(input.amount);
    if (amount.lte(0)) throw new Error("VALIDATION:Transaction amount must be greater than zero.");

    let service: "CASH_WITHDRAWAL" | "CARD_WITHDRAWAL" | "CASH_DEPOSIT" | "TRANSFER" | "AIRTIME" | "DATA" | "GAS_PAYMENT";
    let charge = dec(0);
    let debtPaymentId: string | undefined;
    if (input.category === "GAS_PAYMENT") {
      service = "GAS_PAYMENT";
      if (input.debtId) {
        const debt = await tx.debt.findUnique({ where: { id: input.debtId } });
        if (!debt || debt.status === "CANCELLED" || debt.status === "PAID") throw new Error("CONFLICT:Select an outstanding gas debt to record this payment against.");
        const outstanding = dec(debt.outstandingAmount.toString());
        if (amount.gt(outstanding)) throw new Error(`VALIDATION:Payment cannot exceed this debt's outstanding balance of ${outstanding.toFixed(2)}.`);
        const remaining = outstanding.minus(amount);
        const updatedDebt = await tx.debt.update({ where: { id: debt.id }, data: { outstandingAmount: moneyString(remaining), status: remaining.lte(0) ? "PAID" : "PARTIALLY_PAID" } });
        const payment = await tx.debtPayment.create({ data: { debtId: debt.id, amount: moneyString(amount), paymentMethod: input.paymentMethod, note: input.note?.trim() || "Gas payment recorded in POS" } });
        debtPaymentId = payment.id;
        await tx.auditLog.create({ data: { userId, entityType: "DEBT", entityId: debt.id, action: "PAYMENT", reason: "Gas payment recorded in POS", beforeData: JSON.parse(JSON.stringify({ outstandingAmount: outstanding.toString(), status: debt.status })), afterData: JSON.parse(JSON.stringify({ paymentAmount: amount.toString(), outstandingAmount: updatedDebt.outstandingAmount.toString(), status: updatedDebt.status })) } });
      }
    } else {
      if (!input.service) throw new Error("VALIDATION:Choose a POS service.");
      service = input.service;
      const rawRules = await tx.posChargeRule.findMany({ where: { service, active: true } });
      const rules = rawRules.map((rule) => ({ service: rule.service, minimumAmount: rule.minimumAmount.toString(), maximumAmount: rule.maximumAmount?.toString() ?? null, serviceCharge: rule.serviceCharge.toString(), active: rule.active }));
      charge = findApplicableCharge(amount, service, rules);
    }

    const record = await tx.posTransaction.create({ data: {
      transactionNumber: makeReference("POS"),
      category: input.category,
      service,
      amount: moneyString(amount),
      serviceCharge: moneyString(charge),
      total: moneyString(amount.plus(charge)),
      paymentMethod: input.paymentMethod,
      debtPaymentId,
      note: input.note?.trim() || null,
    } });
    await tx.auditLog.create({ data: { userId, entityType: "POS_TRANSACTION", entityId: record.id, action: "CREATE", afterData: JSON.parse(JSON.stringify({ transactionNumber: record.transactionNumber, category: record.category, service: record.service, amount: amount.toString(), serviceCharge: charge.toString(), total: amount.plus(charge).toString() })) } });
    return { ...record, amount: Number(record.amount), serviceCharge: Number(record.serviceCharge), total: Number(record.total) };
  });
}

export async function listPosTransactions() {
  const records = await prisma.posTransaction.findMany({ orderBy: { createdAt: "desc" }, take: 250, include: { debtPayment: { include: { debt: { select: { customerName: true } } } } } });
  return records.map((r) => ({ ...r, amount: Number(r.amount), serviceCharge: Number(r.serviceCharge), total: Number(r.total), linkedCustomer: r.debtPayment?.debt.customerName ?? null }));
}

export async function getPosTransaction(id: string) {
  const record = await prisma.posTransaction.findUnique({ where: { id }, include: { debtPayment: { include: { debt: { select: { id: true, customerName: true, outstandingAmount: true, originalAmount: true, status: true } } } } } });
  if (!record) throw new Error("NOT_FOUND:POS transaction not found.");
  return { ...record, amount: Number(record.amount), serviceCharge: Number(record.serviceCharge), total: Number(record.total), debtPayment: record.debtPayment ? { ...record.debtPayment, amount: Number(record.debtPayment.amount), debt: { ...record.debtPayment.debt, outstandingAmount: Number(record.debtPayment.debt.outstandingAmount), originalAmount: Number(record.debtPayment.debt.originalAmount) } } : null };
}

export async function correctPosTransaction(id: string, input: { category: "POS_SERVICE" | "GAS_PAYMENT"; service?: PosInput["service"]; amount: number; paymentMethod: NonNullable<PosInput["paymentMethod"]>; note?: string; reason: string }, userId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.posTransaction.findUnique({ where: { id }, include: { debtPayment: { include: { debt: true } } } });
    if (!existing) throw new Error("NOT_FOUND:POS transaction not found.");
    if (existing.status === "VOIDED") throw new Error("CONFLICT:Voided transactions cannot be corrected.");
    if (existing.debtPayment && input.category !== "GAS_PAYMENT") throw new Error("CONFLICT:A gas debt repayment must remain a Gas Payment. Correct its amount or payment method without changing its category.");
    const amount = money(input.amount);
    if (amount.lte(0)) throw new Error("VALIDATION:Amount must be greater than zero.");
    let service: PosInput["service"] | "GAS_PAYMENT";
    let charge = dec(0);
    if (input.category === "GAS_PAYMENT") {
      service = "GAS_PAYMENT";
      if (existing.debtPayment) {
        const payment = existing.debtPayment;
        const delta = dec(payment.amount.toString()).minus(amount);
        const newOutstanding = dec(payment.debt.outstandingAmount.toString()).plus(delta);
        if (newOutstanding.lt(0)) throw new Error("VALIDATION:Corrected payment would exceed the debt balance. Record or reconcile the debt first.");
        if (newOutstanding.gt(payment.debt.originalAmount)) throw new Error("CONFLICT:Correcting this payment would exceed the original debt amount. Reconcile the debt first.");
        await tx.debt.update({ where: { id: payment.debtId }, data: { outstandingAmount: moneyString(newOutstanding), status: newOutstanding.eq(0) ? "PAID" : newOutstanding.eq(payment.debt.originalAmount.toString()) ? "OUTSTANDING" : "PARTIALLY_PAID" } });
        await tx.debtPayment.update({ where: { id: payment.id }, data: { amount: moneyString(amount), paymentMethod: input.paymentMethod, note: input.note?.trim() || payment.note } });
      }
    } else {
      if (!input.service) throw new Error("VALIDATION:Choose a POS service.");
      service = input.service;
      const rawRules = await tx.posChargeRule.findMany({ where: { service, active: true } });
      charge = findApplicableCharge(amount, service, rawRules.map((r) => ({ service: r.service, minimumAmount: r.minimumAmount.toString(), maximumAmount: r.maximumAmount?.toString() ?? null, serviceCharge: r.serviceCharge.toString(), active: r.active })));
    }
    const updated = await tx.posTransaction.update({ where: { id }, data: { category: input.category, service, amount: moneyString(amount), serviceCharge: moneyString(charge), total: moneyString(amount.plus(charge)), paymentMethod: input.paymentMethod, note: input.note?.trim() || null, status: "CORRECTED" } });
    await tx.auditLog.create({ data: { userId, entityType: "POS_TRANSACTION", entityId: id, action: "CORRECT", reason: input.reason, beforeData: JSON.parse(JSON.stringify({ transactionNumber: existing.transactionNumber, category: existing.category, service: existing.service, amount: existing.amount.toString(), serviceCharge: existing.serviceCharge.toString(), total: existing.total.toString(), status: existing.status })), afterData: JSON.parse(JSON.stringify({ category: updated.category, service: updated.service, amount: updated.amount.toString(), serviceCharge: updated.serviceCharge.toString(), total: updated.total.toString(), status: updated.status })) } });
    return { ...updated, amount: Number(updated.amount), serviceCharge: Number(updated.serviceCharge), total: Number(updated.total) };
  });
}

export async function voidPosTransaction(id: string, reason: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.posTransaction.findUnique({ where: { id }, include: { debtPayment: { include: { debt: true } } } });
    if (!existing) throw new Error("NOT_FOUND:POS transaction not found.");
    if (existing.status === "VOIDED") throw new Error("CONFLICT:This transaction is already voided.");
    if (existing.debtPayment) {
      const payment = existing.debtPayment;
      if (payment.debt.status === "CANCELLED") throw new Error("CONFLICT:The linked debt has been cancelled, so this payment cannot be reversed automatically.");
      const newOutstanding = dec(payment.debt.outstandingAmount.toString()).plus(payment.amount.toString());
      if (newOutstanding.gt(payment.debt.originalAmount)) throw new Error("CONFLICT:Reversing this gas payment would exceed the original debt. Reconcile the debt first.");
      await tx.debt.update({ where: { id: payment.debtId }, data: { outstandingAmount: moneyString(newOutstanding), status: newOutstanding.eq(payment.debt.originalAmount.toString()) ? "OUTSTANDING" : "PARTIALLY_PAID" } });
    }
    const updated = await tx.posTransaction.update({ where: { id }, data: { status: "VOIDED", voidedAt: new Date(), voidReason: reason } });
    await tx.auditLog.create({ data: { userId, entityType: "POS_TRANSACTION", entityId: id, action: "VOID", reason, beforeData: JSON.parse(JSON.stringify({ transactionNumber: existing.transactionNumber, amount: existing.amount.toString(), status: existing.status })), afterData: JSON.parse(JSON.stringify({ status: "VOIDED", voidedAt: updated.voidedAt?.toISOString() })) } });
    return updated;
  });
}
