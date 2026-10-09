import { requireApiUser } from "@/lib/auth";
import { recordDebtPayment } from "@/services/gas/debt.service";
import { debtPaymentSchema } from "@/validators/schemas";
import { ok, fail, apiError } from "@/lib/http";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const user = await requireApiUser(); const { id } = await context.params; const parsed = debtPaymentSchema.safeParse(await request.json()); if (!parsed.success) return fail("Enter a valid repayment amount and payment method."); return ok(await recordDebtPayment({ debtId: id, ...parsed.data }, user.id), 201); } catch (error) { return apiError(error); } }
