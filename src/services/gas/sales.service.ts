import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { dec, money, moneyString, quantity, quantityString } from "@/lib/money";
import { makeReference } from "@/lib/utils";
import { allocateFifoStock, reverseSaleStock } from "@/lib/fifo";

type SaleInput = {
  amount: number;
  cashAmount: number;
  transferAmount: number;
  cardAmount: number;
  debtAmount: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
};

function validateSalePayments(input: SaleInput) {
  const amount = money(input.amount);
  const paidAndDebt = money(money(input.cashAmount).plus(money(input.transferAmount)).plus(money(input.cardAmount)).plus(money(input.debtAmount)));
  if (!paidAndDebt.eq(amount)) throw new Error("VALIDATION:Cash, transfer, card, and debt must add up to the sale amount.");
  if (input.debtAmount > 0 && (!input.customerName?.trim() || !input.customerPhone?.trim() || !input.customerAddress?.trim())) {
    throw new Error("VALIDATION:Customer name, phone, and address are required when recording debt.");
  }
}

async function performSale(tx: Prisma.TransactionClient, input: SaleInput, userId: string, saleId?: string, reference?: string, sellingPriceOverride?: Decimal.Value) {
  validateSalePayments(input);
  const settings = await tx.businessSettings.findUnique({ where: { id: "default" } });
  if (!sellingPriceOverride && (!settings || dec(settings?.gasPricePerKg.toString() ?? 0).lte(0))) throw new Error("VALIDATION:Set a valid current gas selling price in Gas Settings before recording a sale.");
  const price = sellingPriceOverride !== undefined ? dec(sellingPriceOverride) : dec(settings!.gasPricePerKg.toString());
  const amount = money(input.amount);
  const kg = quantity(amount.div(price));
  if (kg.lte(0)) throw new Error("VALIDATION:The sale amount is too small to calculate a valid quantity.");

  const id = saleId ?? (await tx.gasSale.create({ data: {
    saleNumber: reference ?? makeReference("GAS"),
    amount: moneyString(amount), quantityKg: quantityString(kg), sellingPricePerKg: moneyString(price),
    costAmount: "0.00", grossProfit: "0.00", cashAmount: moneyString(input.cashAmount),
    transferAmount: moneyString(input.transferAmount), cardAmount: moneyString(input.cardAmount), debtAmount: moneyString(input.debtAmount),
    customerName: input.customerName?.trim() || null, customerPhone: input.customerPhone?.trim() || null, customerAddress: input.customerAddress?.trim() || null,
  } })).id;
  const saleNumber = reference ?? (await tx.gasSale.findUniqueOrThrow({ where: { id } })).saleNumber;
  const allocation = await allocateFifoStock(tx, id, saleNumber, kg);
  const grossProfit = money(amount.minus(allocation.totalCost));
  const sale = await tx.gasSale.update({ where: { id }, data: {
    amount: moneyString(amount), quantityKg: quantityString(kg), sellingPricePerKg: moneyString(price),
    costAmount: allocation.totalCost.toFixed(2), grossProfit: grossProfit.toFixed(2),
    cashAmount: moneyString(input.cashAmount), transferAmount: moneyString(input.transferAmount), cardAmount: moneyString(input.cardAmount), debtAmount: moneyString(input.debtAmount),
    customerName: input.customerName?.trim() || null, customerPhone: input.customerPhone?.trim() || null, customerAddress: input.customerAddress?.trim() || null,
    status: saleId ? "CORRECTED" : "COMPLETED", voidedAt: null, voidReason: null,
  } });

  const existingDebt = await tx.debt.findUnique({ where: { saleId: id } });
  if (input.debtAmount > 0) {
    if (existingDebt) {
      await tx.debt.update({ where: { id: existingDebt.id }, data: {
        customerName: input.customerName!.trim(), customerPhone: input.customerPhone!.trim(), customerAddress: input.customerAddress!.trim(),
        originalAmount: moneyString(input.debtAmount), outstandingAmount: moneyString(input.debtAmount), status: "OUTSTANDING",
      } });
    } else {
      await tx.debt.create({ data: {
        saleId: id, customerName: input.customerName!.trim(), customerPhone: input.customerPhone!.trim(), customerAddress: input.customerAddress!.trim(),
        originalAmount: moneyString(input.debtAmount), outstandingAmount: moneyString(input.debtAmount), status: "OUTSTANDING",
      } });
    }
  } else if (existingDebt) {
    await tx.debt.update({ where: { id: existingDebt.id }, data: { outstandingAmount: "0.00", status: "CANCELLED" } });
  }

  await tx.auditLog.create({ data: {
    userId, entityType: "GAS_SALE", entityId: id, action: saleId ? "CORRECT" : "CREATE",
    afterData: JSON.parse(JSON.stringify({ saleNumber, amount: amount.toString(), quantityKg: kg.toString(), sellingPricePerKg: price.toString(), costAmount: allocation.totalCost.toString(), grossProfit: grossProfit.toString() })),
  } });
  return sale;
}

export async function createGasSale(input: SaleInput, userId: string) {
  return prisma.$transaction(async (tx) => performSale(tx, input, userId));
}

export async function listGasSales() {
  const sales = await prisma.gasSale.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { debt: true } });
  return sales.map((s) => ({ ...s, amount: Number(s.amount), quantityKg: Number(s.quantityKg), sellingPricePerKg: Number(s.sellingPricePerKg), costAmount: Number(s.costAmount), grossProfit: Number(s.grossProfit), cashAmount: Number(s.cashAmount), transferAmount: Number(s.transferAmount), cardAmount: Number(s.cardAmount), debtAmount: Number(s.debtAmount), debt: s.debt ? { ...s.debt, originalAmount: Number(s.debt.originalAmount), outstandingAmount: Number(s.debt.outstandingAmount) } : null }));
}

export async function getGasSale(id: string) {
  const sale = await prisma.gasSale.findUnique({ where: { id }, include: { allocations: { include: { stockBatch: { select: { batchNumber: true } } } }, debt: { include: { payments: { orderBy: { paidAt: "desc" } } } } } });
  if (!sale) throw new Error("NOT_FOUND:Gas sale not found.");
  return {
    ...sale,
    amount: Number(sale.amount), quantityKg: Number(sale.quantityKg), sellingPricePerKg: Number(sale.sellingPricePerKg), costAmount: Number(sale.costAmount), grossProfit: Number(sale.grossProfit),
    cashAmount: Number(sale.cashAmount), transferAmount: Number(sale.transferAmount), cardAmount: Number(sale.cardAmount), debtAmount: Number(sale.debtAmount),
    allocations: sale.allocations.map((a) => ({ ...a, quantityKg: Number(a.quantityKg), costPricePerKg: Number(a.costPricePerKg), costAmount: Number(a.costAmount) })),
    debt: sale.debt ? { ...sale.debt, originalAmount: Number(sale.debt.originalAmount), outstandingAmount: Number(sale.debt.outstandingAmount), payments: sale.debt.payments.map((p) => ({ ...p, amount: Number(p.amount) })) } : null,
  };
}

export async function correctGasSale(id: string, input: SaleInput & { reason: string }, userId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.gasSale.findUnique({ where: { id }, include: { debt: { include: { payments: true } } } });
    if (!existing) throw new Error("NOT_FOUND:Gas sale not found.");
    if (existing.status === "VOIDED") throw new Error("CONFLICT:Voided sales cannot be corrected.");
    if (existing.debt?.payments.length) throw new Error("CONFLICT:This sale has debt repayments. Reconcile those repayments before correcting the sale.");
    const before = JSON.parse(JSON.stringify(existing, (_, value) => typeof value === "object" && value !== null && "toNumber" in value ? value.toString() : value));
    await reverseSaleStock(tx, existing.id, existing.saleNumber, `Correction: ${input.reason}`);
    await tx.debt.updateMany({ where: { saleId: id }, data: { status: "CANCELLED", outstandingAmount: "0.00" } });
    const corrected = await performSale(tx, input, userId, existing.id, existing.saleNumber, existing.sellingPricePerKg.toString());
    await tx.auditLog.create({ data: { userId, entityType: "GAS_SALE", entityId: id, action: "CORRECT", reason: input.reason, beforeData: before, afterData: JSON.parse(JSON.stringify({ amount: input.amount, payments: { cash: input.cashAmount, transfer: input.transferAmount, card: input.cardAmount, debt: input.debtAmount }, correctedAt: new Date().toISOString() })) } });
    return corrected;
  });
}

export async function voidGasSale(id: string, reason: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.gasSale.findUnique({ where: { id }, include: { debt: { include: { payments: true } } } });
    if (!existing) throw new Error("NOT_FOUND:Gas sale not found.");
    if (existing.status === "VOIDED") throw new Error("CONFLICT:This sale is already voided.");
    if (existing.debt?.payments.length) throw new Error("CONFLICT:This sale has debt repayments. Reconcile those repayments before voiding it.");
    await reverseSaleStock(tx, existing.id, existing.saleNumber, `Voided: ${reason}`);
    if (existing.debt) await tx.debt.update({ where: { id: existing.debt.id }, data: { outstandingAmount: "0.00", status: "CANCELLED" } });
    const updated = await tx.gasSale.update({ where: { id }, data: { status: "VOIDED", voidedAt: new Date(), voidReason: reason } });
    await tx.auditLog.create({ data: { userId, entityType: "GAS_SALE", entityId: id, action: "VOID", reason, beforeData: JSON.parse(JSON.stringify({ saleNumber: existing.saleNumber, amount: existing.amount.toString(), status: existing.status })), afterData: JSON.parse(JSON.stringify({ status: "VOIDED", voidedAt: updated.voidedAt?.toISOString() })) } });
    return updated;
  });
}
