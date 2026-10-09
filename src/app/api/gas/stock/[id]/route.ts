import { requireApiUser } from "@/lib/auth";
import { getStockBatch, updateStockBatch } from "@/services/gas/stock.service";
import { purchaseSchema } from "@/validators/schemas";
import { fail, ok, apiError } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { await requireApiUser(); const { id } = await context.params; return ok(await getStockBatch(id)); }
  catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const parsed = purchaseSchema.safeParse(await request.json());
    if (!parsed.success) return fail("Enter a valid quantity, cost price, selling estimate, and purchase date.");
    return ok(await updateStockBatch(id, parsed.data, user.id));
  } catch (error) { return apiError(error); }
}
