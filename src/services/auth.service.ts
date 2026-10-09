import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { SafeUser } from "@/lib/auth";

export async function authenticateOwner(email: string, password: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
  return { id: user.id, name: user.name, email: user.email, forcePasswordChange: user.forcePasswordChange };
}

export async function updateOwnerCredentials(input: {
  userId: string;
  name: string;
  currentPassword: string;
  newEmail: string;
  newPassword: string;
}) {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    throw new Error("VALIDATION:Your current password is incorrect.");
  }
  const duplicate = await prisma.user.findFirst({ where: { email: input.newEmail, NOT: { id: input.userId } } });
  if (duplicate) throw new Error("CONFLICT:That email address is already in use.");
  const updated = await prisma.user.update({
    where: { id: input.userId },
    data: {
      name: input.name,
      email: input.newEmail,
      passwordHash: await bcrypt.hash(input.newPassword, 12),
      forcePasswordChange: false,
    },
    select: { id: true, name: true, email: true, forcePasswordChange: true },
  });
  return updated;
}
