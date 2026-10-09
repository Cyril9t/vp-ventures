import { getCurrentUser } from "@/lib/auth";
import { fail, ok, apiError } from "@/lib/http";
export async function GET() { try { const user = await getCurrentUser(); return user ? ok({ user }) : fail("Please log in to continue.", 401); } catch (error) { return apiError(error); } }
