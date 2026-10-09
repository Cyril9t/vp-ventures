import { requireApiUser } from "@/lib/auth";
import { updateChargeRule, deleteChargeRule } from "@/services/pos/charge-rule.service";
import { chargeRuleSchema } from "@/validators/schemas";
import { ok, fail, apiError } from "@/lib/http";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { const user = await requireApiUser(); const { id } = await context.params; const parsed = chargeRuleSchema.safeParse(await request.json()); if (!parsed.success) return fail("Enter a valid charge-rule range and service charge."); return ok(await updateChargeRule(id, parsed.data as Parameters<typeof updateChargeRule>[1], user.id)); } catch (error) { return apiError(error); } }
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) { try { const user = await requireApiUser(); const { id } = await context.params; return ok(await deleteChargeRule(id, user.id)); } catch (error) { return apiError(error); } }
