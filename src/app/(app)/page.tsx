import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { SystemHome } from "@/components/shared/SystemHome";
export default async function SystemSelectorPage() { const user = await requireUser(); if (user.forcePasswordChange) redirect("/account?required=1"); return <SystemHome />; }
