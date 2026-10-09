import { clearSession } from "@/lib/auth";
import { ok, apiError } from "@/lib/http";
export async function POST() { try { await clearSession(); return ok({ success: true }); } catch (error) { return apiError(error); } }
