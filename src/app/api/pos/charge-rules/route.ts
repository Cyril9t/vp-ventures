import { requireApiUser } from "@/lib/auth";
import { listChargeRules, createChargeRule } from "@/services/pos/charge-rule.service";
import { chargeRuleSchema } from "@/validators/schemas";
import { ok, fail, apiError } from "@/lib/http";
export async function GET() { try { await requireApiUser(); return ok(await listChargeRules()); } catch (error) { return apiError(error); } }
export async function POST(request: Request) { try { const user = await requireApiUser(); const parsed = chargeRuleSchema.safeParse(await request.json()); if (!parsed.success) return fail("Enter a valid charge-rule range and service charge."); return ok(await createChargeRule(parsed.data as Parameters<typeof createChargeRule>[0], user.id), 201); } catch (error) { return apiError(error); } }
