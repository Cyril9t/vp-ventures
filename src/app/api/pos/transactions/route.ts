import { requireApiUser } from "@/lib/auth";
import { createPosTransaction, listPosTransactions } from "@/services/pos/transaction.service";
import { posTransactionSchema } from "@/validators/schemas";
import { ok, fail, apiError } from "@/lib/http";
export async function GET() { try { await requireApiUser(); return ok(await listPosTransactions()); } catch (error) { return apiError(error); } }
export async function POST(request: Request) { try { const user = await requireApiUser(); const parsed = posTransactionSchema.safeParse(await request.json()); if (!parsed.success) return fail("Enter a valid transaction type, amount, and payment method."); if (parsed.data.category === "POS_SERVICE" && !parsed.data.service) return fail("Choose a POS service."); return ok(await createPosTransaction(parsed.data, user.id), 201); } catch (error) { return apiError(error); } }
