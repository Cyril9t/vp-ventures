import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { voidGasSale } from "@/services/gas/sales.service";
import { ok, fail, apiError } from "@/lib/http";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const user = await requireApiUser(); const { id } = await context.params; const parsed = z.object({ reason: z.string().trim().min(3).max(240) }).safeParse(await request.json()); if (!parsed.success) return fail("A reason is required to void a sale."); return ok(await voidGasSale(id, parsed.data.reason, user.id)); } catch (error) { return apiError(error); } }
