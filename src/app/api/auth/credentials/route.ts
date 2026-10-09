import { credentialsSchema } from "@/validators/schemas";
import { requireApiUser, createSession } from "@/lib/auth";
import { updateOwnerCredentials } from "@/services/auth.service";
import { fail, ok, apiError } from "@/lib/http";
export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser({ allowPasswordChange: true });
    const parsed = credentialsSchema.safeParse(await request.json());
    if (!parsed.success) return fail("Enter your name, current password, a valid email, and a new password of at least 10 characters.", 400);
    const updated = await updateOwnerCredentials({ userId: user.id, ...parsed.data });
    await createSession(updated);
    return ok({ user: updated });
  } catch (error) { return apiError(error); }
}
