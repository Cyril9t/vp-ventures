import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { assertNoOverlap, type ChargeRange } from "@/lib/charges";
import { money, moneyString } from "@/lib/money";

const ruleServices = ["CASH_WITHDRAWAL", "CARD_WITHDRAWAL", "CASH_DEPOSIT", "TRANSFER", "AIRTIME", "DATA"] as const;
type RuleService = typeof ruleServices[number];
type RuleInput = { service: RuleService; minimumAmount: number; maximumAmount?: number | null; serviceCharge: number; active?: boolean };

async function lockService(tx: Prisma.TransactionClient, service: RuleService) {
  await tx.$queryRaw<Array<{ pg_advisory_xact_lock: unknown }>>`SELECT pg_advisory_xact_lock(hashtext(${service})::bigint)`;
}

function toRange(rule: { id?: string; service: string; minimumAmount: { toString(): string } | string; maximumAmount: { toString(): string } | string | null; serviceCharge: { toString(): string } | string; active?: boolean }): ChargeRange {
  return { id: rule.id, service: rule.service, minimumAmount: rule.minimumAmount.toString(), maximumAmount: rule.maximumAmount === null ? null : rule.maximumAmount.toString(), serviceCharge: rule.serviceCharge.toString(), active: rule.active };
}

export async function listChargeRules() {
  const rules = await prisma.posChargeRule.findMany({ orderBy: [{ service: "asc" }, { minimumAmount: "asc" }] });
  return rules.map((r) => ({ ...r, minimumAmount: Number(r.minimumAmount), maximumAmount: r.maximumAmount === null ? null : Number(r.maximumAmount), serviceCharge: Number(r.serviceCharge) }));
}

export async function createChargeRule(input: RuleInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    await lockService(tx, input.service);
    const minimumAmount = money(input.minimumAmount);
    const maximumAmount = input.maximumAmount == null ? null : money(input.maximumAmount);
    const serviceCharge = money(input.serviceCharge);
    const normalized = { service: input.service, minimumAmount: minimumAmount.toString(), maximumAmount: maximumAmount?.toString() ?? null, serviceCharge: serviceCharge.toString(), active: input.active ?? true };
    if (normalized.active) {
      const rules = await tx.posChargeRule.findMany({ where: { service: input.service, active: true } });
      assertNoOverlap(normalized, rules.map(toRange));
    }
    const rule = await tx.posChargeRule.create({ data: { service: input.service, minimumAmount: moneyString(minimumAmount), maximumAmount: maximumAmount === null ? null : moneyString(maximumAmount), serviceCharge: moneyString(serviceCharge), active: normalized.active } });
    await tx.auditLog.create({ data: { userId, entityType: "POS_CHARGE_RULE", entityId: rule.id, action: "CREATE", afterData: JSON.parse(JSON.stringify({ ...rule, minimumAmount: rule.minimumAmount.toString(), maximumAmount: rule.maximumAmount?.toString() ?? null, serviceCharge: rule.serviceCharge.toString() })) } });
    return { ...rule, minimumAmount: Number(rule.minimumAmount), maximumAmount: rule.maximumAmount === null ? null : Number(rule.maximumAmount), serviceCharge: Number(rule.serviceCharge) };
  });
}

export async function updateChargeRule(id: string, input: RuleInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.posChargeRule.findUnique({ where: { id } });
    if (!existing) throw new Error("NOT_FOUND:Charge rule not found.");
    const servicesToLock = [...new Set([existing.service, input.service])].sort() as RuleService[];
    for (const service of servicesToLock) await lockService(tx, service);
    const minimumAmount = money(input.minimumAmount);
    const maximumAmount = input.maximumAmount == null ? null : money(input.maximumAmount);
    const serviceCharge = money(input.serviceCharge);
    const normalized = { id, service: input.service, minimumAmount: minimumAmount.toString(), maximumAmount: maximumAmount?.toString() ?? null, serviceCharge: serviceCharge.toString(), active: input.active ?? true };
    if (normalized.active) {
      const rules = await tx.posChargeRule.findMany({ where: { service: input.service, active: true, NOT: { id } } });
      assertNoOverlap(normalized, rules.map(toRange));
    }
    const updated = await tx.posChargeRule.update({ where: { id }, data: { service: input.service, minimumAmount: moneyString(minimumAmount), maximumAmount: maximumAmount === null ? null : moneyString(maximumAmount), serviceCharge: moneyString(serviceCharge), active: normalized.active } });
    await tx.auditLog.create({ data: { userId, entityType: "POS_CHARGE_RULE", entityId: id, action: "UPDATE", beforeData: JSON.parse(JSON.stringify({ ...existing, minimumAmount: existing.minimumAmount.toString(), maximumAmount: existing.maximumAmount?.toString() ?? null, serviceCharge: existing.serviceCharge.toString() })), afterData: JSON.parse(JSON.stringify({ ...updated, minimumAmount: updated.minimumAmount.toString(), maximumAmount: updated.maximumAmount?.toString() ?? null, serviceCharge: updated.serviceCharge.toString() })) } });
    return { ...updated, minimumAmount: Number(updated.minimumAmount), maximumAmount: updated.maximumAmount === null ? null : Number(updated.maximumAmount), serviceCharge: Number(updated.serviceCharge) };
  });
}

export async function deleteChargeRule(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const rule = await tx.posChargeRule.findUnique({ where: { id } });
    if (!rule) throw new Error("NOT_FOUND:Charge rule not found.");
    await lockService(tx, rule.service as RuleService);
    const updated = await tx.posChargeRule.update({ where: { id }, data: { active: false } });
    await tx.auditLog.create({ data: { userId, entityType: "POS_CHARGE_RULE", entityId: id, action: "DELETE", reason: "Rule deactivated; historical transactions are unchanged.", beforeData: JSON.parse(JSON.stringify({ service: rule.service, active: rule.active })), afterData: JSON.parse(JSON.stringify({ service: updated.service, active: updated.active })) } });
    return { success: true };
  });
}
