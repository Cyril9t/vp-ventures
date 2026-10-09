import { requireApiUser } from "@/lib/auth";
import { correctGasSale } from "@/services/gas/sales.service";
import { gasSaleSchema } from "@/validators/schemas";
import { z } from "zod";
import { ok, fail, apiError } from "@/lib/http";
const schema = gasSaleSchema.extend({ reason: z.string().trim().min(3).max(240) });
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { const user = await requireApiUser(); const { id } = await context.params; const parsed = schema.safeParse(await request.json()); if (!parsed.success) return fail("Enter the corrected amount, payment breakdown, customer details if needed, and a reason."); return ok(await correctGasSale(id, parsed.data, user.id)); } catch (error) { return apiError(error); } }
