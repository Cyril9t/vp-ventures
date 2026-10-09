import { requireApiUser } from "@/lib/auth";
import { createGasSale, listGasSales } from "@/services/gas/sales.service";
import { gasSaleSchema } from "@/validators/schemas";
import { ok, fail, apiError } from "@/lib/http";
export async function GET() { try { await requireApiUser(); return ok(await listGasSales()); } catch (error) { return apiError(error); } }
export async function POST(request: Request) { try { const user = await requireApiUser(); const parsed = gasSaleSchema.safeParse(await request.json()); if (!parsed.success) return fail("Enter a valid sale amount and payment breakdown."); return ok(await createGasSale(parsed.data, user.id), 201); } catch (error) { return apiError(error); } }
