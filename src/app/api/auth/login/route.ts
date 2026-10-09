import { NextRequest } from "next/server";
import { loginSchema } from "@/validators/schemas";
import { authenticateOwner } from "@/services/auth.service";
import { createSession } from "@/lib/auth";
import { fail, ok, apiError } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return fail("Enter a valid email and password.", 400);
    const user = await authenticateOwner(parsed.data.email, parsed.data.password);
    if (!user) return fail("The email or password is incorrect.", 401);
    await createSession(user);
    return ok({ user });
  } catch (error) { return apiError(error); }
}
