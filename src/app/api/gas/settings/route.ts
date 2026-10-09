import { requireApiUser } from "@/lib/auth";
import { getGasSettings, updateGasSettings } from "@/services/gas/settings.service";
import { settingsSchema } from "@/validators/schemas";
import { ok, fail, apiError } from "@/lib/http";
export async function GET() { try { await requireApiUser(); return ok(await getGasSettings()); } catch (error) { return apiError(error); } }
export async function PATCH(request: Request) { try { const user = await requireApiUser(); const parsed = settingsSchema.safeParse(await request.json()); if (!parsed.success) return fail("Enter a business name and valid current selling price."); return ok(await updateGasSettings(parsed.data, user.id)); } catch (error) { return apiError(error); } }
