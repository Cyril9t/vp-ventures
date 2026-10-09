import "server-only";
import { prisma } from "@/lib/prisma";
import { startOfToday, endOfToday } from "@/lib/business-dates";
import { dec, money } from "@/lib/money";

export async function getPosDashboard() {
  const start = startOfToday();
  const end = endOfToday();
  const [records, recent, totalOutstandingDebts] = await Promise.all([
    prisma.posTransaction.findMany({ where: { createdAt: { gte: start, lt: end }, status: { not: "VOIDED" } } }),
    prisma.posTransaction.findMany({ orderBy: { createdAt: "desc" }, take: 7, include: { debtPayment: { include: { debt: { select: { customerName: true } } } } } }),
    prisma.debt.aggregate({ where: { status: { in: ["OUTSTANDING", "PARTIALLY_PAID"] } }, _sum: { outstandingAmount: true } }),
  ]);
  const totals = records.reduce((sum, r) => ({
    count: sum.count + 1,
    amount: sum.amount.plus(r.amount.toString()),
    serviceRevenue: sum.serviceRevenue.plus(r.category === "POS_SERVICE" ? r.serviceCharge.toString() : 0),
    gasPayments: sum.gasPayments.plus(r.category === "GAS_PAYMENT" ? r.amount.toString() : 0),
  }), { count: 0, amount: dec(0), serviceRevenue: dec(0), gasPayments: dec(0) });
  const breakdown: Record<string, number> = {};
  for (const r of records) {
    const name = r.service ?? "OTHER";
    breakdown[name] = (breakdown[name] ?? 0) + 1;
  }
  return {
    today: { totalTransactions: totals.count, amountProcessed: money(totals.amount).toNumber(), serviceRevenue: money(totals.serviceRevenue).toNumber(), gasPayments: money(totals.gasPayments).toNumber() },
    serviceBreakdown: breakdown,
    outstandingGasDebt: Number(totalOutstandingDebts._sum.outstandingAmount ?? 0),
    recentTransactions: recent.map((r) => ({ id: r.id, transactionNumber: r.transactionNumber, category: r.category, service: r.service, amount: Number(r.amount), serviceCharge: Number(r.serviceCharge), total: Number(r.total), status: r.status, paymentMethod: r.paymentMethod, createdAt: r.createdAt, customerName: r.debtPayment?.debt.customerName ?? null })),
  };
}
