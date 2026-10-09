import "server-only";
import { prisma } from "@/lib/prisma";
import { startOfToday, endOfToday } from "@/lib/business-dates";
import { dec, money } from "@/lib/money";

export async function getGasDashboard() {
  const start = startOfToday();
  const end = endOfToday();
  const [sales, stock, debts, recentSales, settings] = await Promise.all([
    prisma.gasSale.findMany({ where: { createdAt: { gte: start, lt: end }, status: { not: "VOIDED" } } }),
    prisma.stockBatch.aggregate({ _sum: { remainingQuantity: true } }),
    prisma.debt.aggregate({ where: { status: { in: ["OUTSTANDING", "PARTIALLY_PAID"] } }, _sum: { outstandingAmount: true } }),
    prisma.gasSale.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { debt: { select: { outstandingAmount: true, status: true } } } }),
    prisma.businessSettings.findUnique({ where: { id: "default" } }),
  ]);
  const totals = sales.reduce((sum, sale) => ({
    amount: sum.amount.plus(sale.amount.toString()),
    quantity: sum.quantity.plus(sale.quantityKg.toString()),
    profit: sum.profit.plus(sale.grossProfit.toString()),
    cash: sum.cash.plus(sale.cashAmount.toString()),
    transfer: sum.transfer.plus(sale.transferAmount.toString()),
    card: sum.card.plus(sale.cardAmount.toString()),
    debt: sum.debt.plus(sale.debtAmount.toString()),
  }), { amount: dec(0), quantity: dec(0), profit: dec(0), cash: dec(0), transfer: dec(0), card: dec(0), debt: dec(0) });
  return {
    today: {
      salesAmount: money(totals.amount).toNumber(), gasSoldKg: Number(totals.quantity.toFixed(4)), grossProfit: money(totals.profit).toNumber(),
      payments: { cash: money(totals.cash).toNumber(), transfer: money(totals.transfer).toNumber(), card: money(totals.card).toNumber(), debt: money(totals.debt).toNumber() },
    },
    currentStockKg: Number(stock._sum.remainingQuantity ?? 0),
    outstandingDebt: Number(debts._sum.outstandingAmount ?? 0),
    currentSellingPricePerKg: Number(settings?.gasPricePerKg ?? 0),
    businessName: settings?.businessName ?? "VP Ventures",
    recentSales: recentSales.map((s) => ({ id: s.id, saleNumber: s.saleNumber, customerName: s.customerName, amount: Number(s.amount), quantityKg: Number(s.quantityKg), grossProfit: Number(s.grossProfit), status: s.status, createdAt: s.createdAt, debtStatus: s.debt?.status ?? null })),
  };
}
