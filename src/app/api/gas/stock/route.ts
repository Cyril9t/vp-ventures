import { requireApiUser } from "@/lib/auth";
import { createPurchase, listStock } from "@/services/gas/stock.service";
import { purchaseSchema } from "@/validators/schemas";
import { ok, fail, apiError } from "@/lib/http";
export async function GET() { try { await requireApiUser(); return ok(await listStock()); } catch (error) { return apiError(error); } }
export async function POST(request: Request) { try { const user = await requireApiUser(); const parsed = purchaseSchema.safeParse(await request.json()); if (!parsed.success) return fail("Enter a valid quantity, cost price, selling price, and purchase date."); return ok(await createPurchase(parsed.data, user.id), 201); } catch (error) { return apiError(error); } }
