import { requireApiUser } from "@/lib/auth";
import { getGasDashboard } from "@/services/gas/dashboard.service";
import { ok, apiError } from "@/lib/http";
export async function GET() { try { await requireApiUser(); return ok(await getGasDashboard()); } catch (error) { return apiError(error); } }
