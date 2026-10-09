import { requireApiUser } from "@/lib/auth";
import { listDebts } from "@/services/gas/debt.service";
import { ok, apiError } from "@/lib/http";
export async function GET() { try { await requireApiUser(); return ok(await listDebts()); } catch (error) { return apiError(error); } }
