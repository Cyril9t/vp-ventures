"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/client-api";
import { Brand } from "@/components/shared/WorkspaceShell";

type Owner = { id?: string; name: string; email: string; forcePasswordChange: boolean };
export function AccountForm({ required = false }: { required?: boolean }) {
  const router = useRouter();
  const [user, setUser] = useState<Owner>({ name: "", email: "", forcePasswordChange: false });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiRequest<{ user: Owner }>("/api/auth/me").then((r) => setUser(r.user)).catch(() => router.replace("/login")).finally(() => setLoading(false)); }, [router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    try {
      const response = await apiRequest<{ user: Owner }>("/api/auth/credentials", { method: "PATCH", body: JSON.stringify({ name: user.name, currentPassword, newEmail: user.email, newPassword }) });
      setUser(response.user); setCurrentPassword(""); setNewPassword(""); toast.success("Login details updated."); router.replace("/"); router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update account."); }
    finally { setBusy(false); }
  }
  return <main className="system-home" style={{ maxWidth: 760 }}>
    <div className="system-home-top" style={{ marginBottom: 32 }}><Brand /><Link href="/" className="switch-link"><ArrowLeft size={15} /> Back to workspaces</Link></div>
    <div className="page-heading"><div><div className="eyebrow">OWNER ACCOUNT</div><h1 className="page-title">Account & security</h1><p className="page-description">Maintain the login details for your private business workspace.</p></div></div>
    {(required || user.forcePasswordChange) && <div className="notice" style={{ marginBottom: 18 }}>For security, change the initial password before continuing with everyday operations.</div>}
    <form className="surface" onSubmit={submit}>
      <div className="form-section"><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><div className="empty-icon" style={{ width: 39, height: 39, margin: 0 }}><ShieldCheck size={19} /></div><div><h2 className="form-section-title" style={{ margin: 0 }}>Owner details</h2><p className="surface-subtitle">There is one owner account in version one.</p></div></div>
        <div className="field-grid" style={{ marginTop: 20 }}>
          <label className="field"><span className="field-label">Display name</span><input className="input" value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} minLength={2} required disabled={loading} /></label>
          <label className="field"><span className="field-label">Email address</span><input className="input" type="email" value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} required disabled={loading} /></label>
          <label className="field full-span"><span className="field-label">Current password</span><input className="input" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required disabled={loading} /></label>
          <label className="field full-span"><span className="field-label">New password</span><input className="input" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={10} required disabled={loading} /><span className="field-hint">Use at least 10 characters. Choose a password you do not use elsewhere.</span></label>
        </div>
      </div>
      <div className="form-actions"><button className="button secondary" type="button" onClick={() => router.push("/")}>Cancel</button><button className="button" type="submit" disabled={busy || loading}>{busy ? "Updating…" : "Update login details"}</button></div>
    </form>
    <div className="notice neutral" style={{ marginTop: 16 }}>Passwords are stored as secure hashes. Sessions use an HTTP-only cookie and the account cannot be registered publicly.</div>
  </main>;
}
