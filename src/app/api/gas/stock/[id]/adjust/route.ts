import { requireApiUser } from "@/lib/auth";
import { adjustStockBatch } from "@/services/gas/stock.service";
import { adjustmentSchema } from "@/validators/schemas";
import { ok, fail, apiError } from "@/lib/http";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const user = await requireApiUser(); const { id } = await context.params; const parsed = adjustmentSchema.safeParse(await request.json()); if (!parsed.success) return fail("Enter a valid physical stock quantity and a reason."); return ok(await adjustStockBatch({ batchId: id, ...parsed.data }, user.id)); } catch (error) { return apiError(error); } }
