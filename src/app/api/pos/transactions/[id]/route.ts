import { requireApiUser } from "@/lib/auth";
import { getPosTransaction } from "@/services/pos/transaction.service";
import { ok, apiError } from "@/lib/http";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) { try { await requireApiUser(); const { id } = await context.params; return ok(await getPosTransaction(id)); } catch (error) { return apiError(error); } }
