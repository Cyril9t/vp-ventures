import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { dec, money, moneyString, quantity, quantityString } from "@/lib/money";
import { makeReference } from "@/lib/utils";

export async function listStock() {
  const batches = await prisma.stockBatch.findMany({ include: { allocations: { select: { quantityKg: true } } }, orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }] });
  return batches.map((batch) => ({
    ...batch,
    soldQuantity: quantity(batch.allocations.reduce((sum, allocation) => sum.plus(allocation.quantityKg.toString()), new Decimal(0))).toNumber(),
    quantityPurchased: Number(batch.quantityPurchased),
    remainingQuantity: Number(batch.remainingQuantity),
    costPricePerKg: Number(batch.costPricePerKg),
    expectedSellingPricePerKg: Number(batch.expectedSellingPricePerKg),
    totalPurchaseCost: Number(batch.totalPurchaseCost),
    expectedRevenue: money(dec(batch.quantityPurchased.toString()).mul(batch.expectedSellingPricePerKg.toString())).toNumber(),
    expectedGrossProfit: money(dec(batch.quantityPurchased.toString()).mul(dec(batch.expectedSellingPricePerKg.toString()).minus(batch.costPricePerKg.toString()))).toNumber(),
  }));
}

export async function createPurchase(input: {
  quantityKg: number;
  costPricePerKg: number;
  expectedSellingPricePerKg: number;
  purchaseDate: Date;
}, userId: string) {
  const quantityKg = quantity(input.quantityKg);
  const costPricePerKg = money(input.costPricePerKg);
  const expectedSellingPricePerKg = money(input.expectedSellingPricePerKg);
  const cost = money(dec(quantityKg.toString()).mul(costPricePerKg));
  const batch = await prisma.$transaction(async (tx) => {
    const created = await tx.stockBatch.create({
      data: {
        batchNumber: makeReference("BATCH"),
        purchaseDate: input.purchaseDate,
        quantityPurchased: quantityString(quantityKg),
        remainingQuantity: quantityString(quantityKg),
        costPricePerKg: moneyString(costPricePerKg),
        expectedSellingPricePerKg: moneyString(expectedSellingPricePerKg),
        totalPurchaseCost: cost.toFixed(2),
        status: "ACTIVE",
      },
    });
    await tx.stockMovement.create({ data: {
      stockBatchId: created.id,
      type: "PURCHASE",
      quantityDelta: quantityString(quantityKg),
      unitCost: moneyString(costPricePerKg),
      reason: "Stock purchase",
      reference: created.batchNumber,
    } });
    await tx.auditLog.create({ data: {
      userId,
      entityType: "STOCK_BATCH",
      entityId: created.id,
      action: "CREATE",
      afterData: JSON.parse(JSON.stringify({ batchNumber: created.batchNumber, quantityKg: quantityKg.toString(), costPricePerKg: costPricePerKg.toString(), expectedSellingPricePerKg: expectedSellingPricePerKg.toString() })),
    } });
    return created;
  });
  return batch;
}


export async function updateStockBatch(id: string, input: {
  quantityKg: number;
  costPricePerKg: number;
  expectedSellingPricePerKg: number;
  purchaseDate: Date;
}, userId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "StockBatch" WHERE "id" = ${id} FOR UPDATE`;
    const existing = await tx.stockBatch.findUnique({ where: { id }, include: { allocations: true, movements: true } });
    if (!existing) throw new Error("NOT_FOUND:Stock batch not found.");
    const hasSales = existing.allocations.length > 0;
    const hasStockChanges = existing.movements.some((movement) => movement.type !== "PURCHASE");
    if (hasSales || hasStockChanges) {
      throw new Error("CONFLICT:This purchase cannot be edited after stock has been sold or adjusted. Keep the original history and record a new purchase or stock adjustment instead.");
    }

    const quantityKg = quantity(input.quantityKg);
    const costPricePerKg = money(input.costPricePerKg);
    const expectedSellingPricePerKg = money(input.expectedSellingPricePerKg);
    const totalPurchaseCost = money(dec(quantityKg.toString()).mul(costPricePerKg));
    const updated = await tx.stockBatch.update({ where: { id }, data: {
      purchaseDate: input.purchaseDate,
      quantityPurchased: quantityString(quantityKg),
      remainingQuantity: quantityString(quantityKg),
      costPricePerKg: moneyString(costPricePerKg),
      expectedSellingPricePerKg: moneyString(expectedSellingPricePerKg),
      totalPurchaseCost: moneyString(totalPurchaseCost),
      status: quantityKg.gt(0) ? "ACTIVE" : "FINISHED",
    } });
    await tx.stockMovement.updateMany({ where: { stockBatchId: id, type: "PURCHASE" }, data: {
      quantityDelta: quantityString(quantityKg),
      unitCost: moneyString(costPricePerKg),
      reason: "Stock purchase updated",
      reference: updated.batchNumber,
    } });
    await tx.auditLog.create({ data: {
      userId, entityType: "STOCK_BATCH", entityId: id, action: "UPDATE", reason: "Purchase details edited before stock was sold or adjusted.",
      beforeData: JSON.parse(JSON.stringify({ batchNumber: existing.batchNumber, purchaseDate: existing.purchaseDate.toISOString(), quantityPurchased: existing.quantityPurchased.toString(), costPricePerKg: existing.costPricePerKg.toString(), expectedSellingPricePerKg: existing.expectedSellingPricePerKg.toString(), totalPurchaseCost: existing.totalPurchaseCost.toString() })),
      afterData: JSON.parse(JSON.stringify({ batchNumber: updated.batchNumber, purchaseDate: updated.purchaseDate.toISOString(), quantityPurchased: updated.quantityPurchased.toString(), costPricePerKg: updated.costPricePerKg.toString(), expectedSellingPricePerKg: updated.expectedSellingPricePerKg.toString(), totalPurchaseCost: updated.totalPurchaseCost.toString() })),
    } });
    return { ...updated, quantityPurchased: Number(updated.quantityPurchased), remainingQuantity: Number(updated.remainingQuantity), costPricePerKg: Number(updated.costPricePerKg), expectedSellingPricePerKg: Number(updated.expectedSellingPricePerKg), totalPurchaseCost: Number(updated.totalPurchaseCost) };
  });
}

export async function getStockBatch(id: string) {
  const batch = await prisma.stockBatch.findUnique({
    where: { id },
    include: {
      allocations: { include: { sale: { select: { id: true, saleNumber: true, amount: true, createdAt: true, status: true } } } },
      movements: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!batch) throw new Error("NOT_FOUND:Stock batch not found.");
  const purchased = dec(batch.quantityPurchased.toString());
  const remaining = dec(batch.remainingQuantity.toString());
  const sold = quantity(batch.allocations.reduce((sum, allocation) => sum.plus(allocation.quantityKg.toString()), new Decimal(0)));
  return {
    ...batch,
    quantityPurchased: purchased.toNumber(),
    remainingQuantity: remaining.toNumber(),
    soldQuantity: sold.toNumber(),
    costPricePerKg: Number(batch.costPricePerKg),
    expectedSellingPricePerKg: Number(batch.expectedSellingPricePerKg),
    totalPurchaseCost: Number(batch.totalPurchaseCost),
    expectedRevenue: money(purchased.mul(batch.expectedSellingPricePerKg.toString())).toNumber(),
    expectedGrossProfit: money(purchased.mul(dec(batch.expectedSellingPricePerKg.toString()).minus(batch.costPricePerKg.toString()))).toNumber(),
    allocations: batch.allocations.map((a) => ({ ...a, quantityKg: Number(a.quantityKg), costPricePerKg: Number(a.costPricePerKg), costAmount: Number(a.costAmount), sale: { ...a.sale, amount: Number(a.sale.amount) } })),
    movements: batch.movements.map((m) => ({ ...m, quantityDelta: Number(m.quantityDelta), unitCost: m.unitCost ? Number(m.unitCost) : null })),
  };
}

export async function adjustStockBatch(input: { batchId: string; physicalQuantityKg: number; reason: string }, userId: string) {
  return prisma.$transaction(async (tx) => {
    // Lock stock rows before comparing physical quantity, preventing adjustments
    // from racing with another stock movement or sale.
    await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "StockBatch" ORDER BY "purchaseDate" ASC, "createdAt" ASC FOR UPDATE`;
    const target = await tx.stockBatch.findUnique({ where: { id: input.batchId } });
    if (!target) throw new Error("NOT_FOUND:Stock batch not found.");
    const currentTotal = await tx.stockBatch.aggregate({ _sum: { remainingQuantity: true } });
    const currentSystem = dec(currentTotal._sum.remainingQuantity?.toString() ?? 0);
    const targetPhysical = quantity(input.physicalQuantityKg);
    const difference = quantity(targetPhysical.minus(currentSystem));
    if (difference.eq(0)) return { difference: 0, currentSystem: currentSystem.toNumber(), physical: targetPhysical.toNumber() };

    const batches = await tx.stockBatch.findMany({ where: { remainingQuantity: { gt: 0 } }, orderBy: [{ purchaseDate: "asc" }, { createdAt: "asc" }] });
    if (difference.gt(0)) {
      const costBasis = batches.length ? batches[batches.length - 1].costPricePerKg : target.costPricePerKg;
      const settings = await tx.businessSettings.findUnique({ where: { id: "default" } });
      const adjustmentBatch = await tx.stockBatch.create({ data: {
        batchNumber: makeReference("ADJ"), purchaseDate: new Date(), quantityPurchased: quantityString(difference), remainingQuantity: quantityString(difference),
        costPricePerKg: moneyString(costBasis.toString()), expectedSellingPricePerKg: moneyString(settings && dec(settings.gasPricePerKg.toString()).gt(0) ? settings.gasPricePerKg.toString() : target.expectedSellingPricePerKg.toString()),
        totalPurchaseCost: moneyString(dec(difference.toString()).mul(costBasis.toString())), status: "ACTIVE",
      } });
      await tx.stockMovement.create({ data: { stockBatchId: adjustmentBatch.id, type: "ADJUSTMENT_IN", quantityDelta: quantityString(difference), unitCost: costBasis.toString(), reason: input.reason, reference: adjustmentBatch.batchNumber } });
    } else {
      let toRemove = difference.abs();
      const available = batches.reduce((sum, b) => sum.plus(b.remainingQuantity.toString()), new Decimal(0));
      if (available.lt(toRemove)) throw new Error("VALIDATION:Physical stock cannot be lower than zero.");
      for (const batch of batches) {
        if (toRemove.lte(0)) break;
        const remaining = dec(batch.remainingQuantity.toString());
        const remove = Decimal.min(remaining, toRemove);
        const after = quantity(remaining.minus(remove));
        await tx.stockBatch.update({ where: { id: batch.id }, data: { remainingQuantity: quantityString(after), status: after.lte(0) ? "FINISHED" : "ACTIVE" } });
        await tx.stockMovement.create({ data: { stockBatchId: batch.id, type: "ADJUSTMENT_OUT", quantityDelta: quantityString(remove.negated()), unitCost: batch.costPricePerKg.toString(), reason: input.reason, reference: target.batchNumber } });
        toRemove = toRemove.minus(remove);
      }
    }
    await tx.auditLog.create({ data: {
      userId, entityType: "STOCK_BATCH", entityId: target.id, action: "ADJUST", reason: input.reason,
      beforeData: JSON.parse(JSON.stringify({ systemKg: currentSystem.toString() })),
      afterData: JSON.parse(JSON.stringify({ physicalKg: targetPhysical.toString(), differenceKg: difference.toString() })),
    } });
    return { difference: difference.toNumber(), currentSystem: currentSystem.toNumber(), physical: targetPhysical.toNumber() };
  });
}
