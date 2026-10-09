import { requireApiUser } from "@/lib/auth";
import { getPosDashboard } from "@/services/pos/dashboard.service";
import { ok, apiError } from "@/lib/http";
export async function GET() { try { await requireApiUser(); return ok(await getPosDashboard()); } catch (error) { return apiError(error); } }
