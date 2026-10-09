import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { voidPosTransaction } from "@/services/pos/transaction.service";
import { ok, fail, apiError } from "@/lib/http";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const user = await requireApiUser(); const { id } = await context.params; const parsed = z.object({ reason: z.string().trim().min(3).max(240) }).safeParse(await request.json()); if (!parsed.success) return fail("A reason is required to void a transaction."); return ok(await voidPosTransaction(id, parsed.data.reason, user.id)); } catch (error) { return apiError(error); } }
