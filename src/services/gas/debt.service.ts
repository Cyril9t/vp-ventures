import "server-only";
import { prisma } from "@/lib/prisma";
import { dec, money, moneyString } from "@/lib/money";

export async function listDebts() {
  const debts = await prisma.debt.findMany({
    where: { status: { not: "CANCELLED" } },
    include: { sale: { select: { saleNumber: true, createdAt: true } }, payments: { orderBy: { paidAt: "desc" }, take: 1 } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
  return debts.map((debt) => ({
    ...debt,
    originalAmount: Number(debt.originalAmount),
    outstandingAmount: Number(debt.outstandingAmount),
    lastPayment: debt.payments[0] ? { ...debt.payments[0], amount: Number(debt.payments[0].amount) } : null,
    payments: undefined,
  }));
}

export async function recordDebtPayment(input: { debtId: string; amount: number; paymentMethod: "CASH" | "TRANSFER" | "CARD"; paidAt?: Date; note?: string }, userId: string) {
  return prisma.$transaction(async (tx) => {
    const debt = await tx.debt.findUnique({ where: { id: input.debtId } });
    if (!debt) throw new Error("NOT_FOUND:Debt record not found.");
    if (debt.status === "CANCELLED" || debt.status === "PAID") throw new Error("CONFLICT:This debt is no longer payable.");
    const payment = money(input.amount);
    const outstanding = dec(debt.outstandingAmount.toString());
    if (payment.lte(0)) throw new Error("VALIDATION:Payment must be greater than zero.");
    if (payment.greaterThan(outstanding)) throw new Error(`VALIDATION:Payment cannot exceed the outstanding balance of ${outstanding.toFixed(2)}.`);
    const remaining = outstanding.minus(payment);
    const updatedDebt = await tx.debt.update({ where: { id: debt.id }, data: { outstandingAmount: moneyString(remaining), status: remaining.lte(0) ? "PAID" : "PARTIALLY_PAID" } });
    const record = await tx.debtPayment.create({ data: {
      debtId: debt.id,
      amount: moneyString(payment),
      paymentMethod: input.paymentMethod,
      paidAt: input.paidAt ?? new Date(),
      note: input.note?.trim() || null,
    } });
    await tx.auditLog.create({ data: { userId, entityType: "DEBT", entityId: debt.id, action: "PAYMENT", reason: input.note || "Debt repayment", beforeData: JSON.parse(JSON.stringify({ outstandingAmount: outstanding.toString(), status: debt.status })), afterData: JSON.parse(JSON.stringify({ paymentAmount: payment.toString(), remainingAmount: remaining.toString(), status: updatedDebt.status })) } });
    return { payment: { ...record, amount: Number(record.amount) }, debt: { ...updatedDebt, outstandingAmount: Number(updatedDebt.outstandingAmount), originalAmount: Number(updatedDebt.originalAmount) } };
  });
}
