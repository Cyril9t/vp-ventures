import Decimal from "decimal.js";
import type { Prisma } from "@/generated/prisma/client";
import { money, moneyString, quantity, quantityString } from "@/lib/money";

export async function allocateFifoStock(
  tx: Prisma.TransactionClient,
  saleId: string,
  saleNumber: string,
  quantityNeededValue: Decimal.Value,
) {
  const quantityNeeded = quantity(quantityNeededValue);
  // Lock the eligible batches while this sale is processed to reduce overselling under concurrent requests.
  await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "StockBatch"
    WHERE "remainingQuantity" > 0
    ORDER BY "purchaseDate" ASC, "createdAt" ASC
    FOR UPDATE
  `;
  const batches = await tx.stockBatch.findMany({
    where: { remainingQuantity: { gt: 0 } },
    orderBy: [{ purchaseDate: "asc" }, { createdAt: "asc" }],
  });
  const available = batches.reduce((sum, batch) => sum.plus(batch.remainingQuantity.toString()), new Decimal(0));
  if (available.lessThan(quantityNeeded)) {
    throw new Error(`INSUFFICIENT_STOCK:Only ${available.toDecimalPlaces(4).toString()} kg is currently available.`);
  }

  let toAllocate = quantityNeeded;
  let totalCost = new Decimal(0);
  const allocations: Array<{ batchId: string; quantity: Decimal; unitCost: Decimal; cost: Decimal }> = [];

  for (const batch of batches) {
    if (toAllocate.lte(0)) break;
    const remaining = new Decimal(batch.remainingQuantity.toString());
    const use = Decimal.min(remaining, toAllocate);
    const unitCost = new Decimal(batch.costPricePerKg.toString());
    const cost = money(use.mul(unitCost));
    const newRemaining = quantity(remaining.minus(use));

    await tx.stockBatch.update({
      where: { id: batch.id },
      data: { remainingQuantity: quantityString(newRemaining), status: newRemaining.lte(0) ? "FINISHED" : "ACTIVE" },
    });
    await tx.gasSaleAllocation.create({
      data: {
        saleId,
        stockBatchId: batch.id,
        quantityKg: quantityString(use),
        costPricePerKg: unitCost.toFixed(2),
        costAmount: cost.toFixed(2),
      },
    });
    await tx.stockMovement.create({
      data: {
        stockBatchId: batch.id,
        gasSaleId: saleId,
        type: "SALE",
        quantityDelta: quantityString(use.negated()),
        unitCost: unitCost.toFixed(2),
        reason: "Gas sale",
        reference: saleNumber,
      },
    });
    allocations.push({ batchId: batch.id, quantity: use, unitCost, cost });
    totalCost = totalCost.plus(cost);
    toAllocate = toAllocate.minus(use);
  }

  return { totalCost: money(totalCost), allocations };
}

export async function reverseSaleStock(tx: Prisma.TransactionClient, saleId: string, saleNumber: string, reason: string) {
  const allocations = await tx.gasSaleAllocation.findMany({ where: { saleId } });
  for (const allocation of allocations) {
    const batch = await tx.stockBatch.findUnique({ where: { id: allocation.stockBatchId } });
    if (!batch) throw new Error("CONFLICT:An original stock batch is missing; this transaction cannot be reversed safely.");
    const restored = quantity(new Decimal(batch.remainingQuantity.toString()).plus(allocation.quantityKg.toString()));
    await tx.stockBatch.update({
      where: { id: batch.id },
      data: { remainingQuantity: quantityString(restored), status: restored.gt(0) ? "ACTIVE" : "FINISHED" },
    });
    await tx.stockMovement.create({
      data: {
        stockBatchId: batch.id,
        gasSaleId: saleId,
        type: "REVERSAL",
        quantityDelta: quantityString(allocation.quantityKg.toString()),
        unitCost: allocation.costPricePerKg.toString(),
        reason,
        reference: saleNumber,
      },
    });
  }
  await tx.gasSaleAllocation.deleteMany({ where: { saleId } });
}
