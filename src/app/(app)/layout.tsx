import { requireUser } from "@/lib/auth";

export default async function PrivateAppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireUser();
  return <div className="app-frame">{children}</div>;
}
