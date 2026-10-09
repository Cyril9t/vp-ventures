import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { correctPosTransaction } from "@/services/pos/transaction.service";
import { ok, fail, apiError } from "@/lib/http";
const schema = z.object({ category: z.enum(["POS_SERVICE", "GAS_PAYMENT"]), service: z.enum(["CASH_WITHDRAWAL", "CARD_WITHDRAWAL", "CASH_DEPOSIT", "TRANSFER", "AIRTIME", "DATA"]).optional(), amount: z.coerce.number().positive(), paymentMethod: z.enum(["CASH", "TRANSFER", "CARD"]), note: z.string().max(240).optional(), reason: z.string().trim().min(3).max(240) });
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { const user = await requireApiUser(); const { id } = await context.params; const parsed = schema.safeParse(await request.json()); if (!parsed.success) return fail("Enter the corrected transaction details and a reason."); return ok(await correctPosTransaction(id, parsed.data, user.id)); } catch (error) { return apiError(error); } }
