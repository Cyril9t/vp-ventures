import { requireConfiguredUser } from "@/lib/auth";
import { WorkspaceShell } from "@/components/shared/WorkspaceShell";
export default async function PosLayout({ children }: Readonly<{ children: React.ReactNode }>) { await requireConfiguredUser(); return <WorkspaceShell workspace="pos">{children}</WorkspaceShell>; }
