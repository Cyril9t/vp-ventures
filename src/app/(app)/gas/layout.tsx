import { requireConfiguredUser } from "@/lib/auth";
import { WorkspaceShell } from "@/components/shared/WorkspaceShell";
export default async function GasLayout({ children }: Readonly<{ children: React.ReactNode }>) { await requireConfiguredUser(); return <WorkspaceShell workspace="gas">{children}</WorkspaceShell>; }
