import { requireApiUser } from "@/lib/auth";
import { getGasSale } from "@/services/gas/sales.service";
import { ok, apiError } from "@/lib/http";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) { try { await requireApiUser(); const { id } = await context.params; return ok(await getGasSale(id)); } catch (error) { return apiError(error); } }
