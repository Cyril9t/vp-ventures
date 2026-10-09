import "server-only";
import { prisma } from "@/lib/prisma";
import { moneyString } from "@/lib/money";

export async function getGasSettings() {
  return prisma.businessSettings.upsert({
    where: { id: "default" },
    create: { id: "default", businessName: "VP Ventures", gasPricePerKg: "0.00" },
    update: {},
  }).then((settings) => ({ ...settings, gasPricePerKg: Number(settings.gasPricePerKg) }));
}

export async function updateGasSettings(input: { businessName: string; phone?: string | null; address?: string | null; gasPricePerKg: number }, userId: string) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.businessSettings.upsert({
      where: { id: "default" },
      create: { id: "default", businessName: "VP Ventures", gasPricePerKg: "0.00" },
      update: {},
    });
    const updated = await tx.businessSettings.update({
      where: { id: "default" },
      data: { businessName: input.businessName, phone: input.phone || null, address: input.address || null, gasPricePerKg: moneyString(input.gasPricePerKg) },
    });
    await tx.auditLog.create({ data: {
      userId, entityType: "SETTINGS", entityId: "default", action: "UPDATE",
      beforeData: JSON.parse(JSON.stringify({ ...before, gasPricePerKg: before.gasPricePerKg.toString() })),
      afterData: JSON.parse(JSON.stringify({ ...updated, gasPricePerKg: updated.gasPricePerKg.toString() })),
    } });
    return { ...updated, gasPricePerKg: Number(updated.gasPricePerKg) };
  });
}
