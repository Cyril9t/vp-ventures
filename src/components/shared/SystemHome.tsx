"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CircleUserRound, CreditCard, Flame, LogOut, Package, ReceiptText } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/client-api";
import { Brand } from "@/components/shared/WorkspaceShell";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

type User = { id: string; name: string; email: string; forcePasswordChange: boolean };
export function SystemHome() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => { apiRequest<{ user: User }>("/api/auth/me").then((r) => setUser(r.user)).catch(() => router.replace("/login")); }, [router]);
  async function logout() {
    try { await apiRequest("/api/auth/logout", { method: "POST", body: "{}" }); router.replace("/login"); router.refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to log out."); }
  }
  return <div className="system-home">
    <div className="system-home-top"><Brand /><div style={{ display: "flex", gap: 8, alignItems: "center" }}><ThemeToggle compact /><Link className="account-link" href="/account" aria-label="Account settings"><CircleUserRound size={18} /></Link><button className="account-link" onClick={logout} aria-label="Log out"><LogOut size={18} /></button></div></div>
    <div className="system-hero"><div className="eyebrow">BUSINESS OVERVIEW</div><h1>Good to have you back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.</h1><p>Choose a workspace to continue. Your gas operations and POS services are organized separately, so you can focus on what you need.</p></div>
    {user?.forcePasswordChange && <div className="notice" style={{ marginBottom: 20 }}>Your initial password must be changed before everyday use. <Link href="/account?required=1" style={{ fontWeight: 800, textDecoration: "underline" }}>Update your login details</Link>.</div>}
    <div className="system-cards">
      <Link href="/gas" className="system-card" style={{ "--accent": "#F97316", "--soft": "#FFF1E7" } as CSSProperties}>
        <div><div className="system-card-icon"><Flame size={24} /></div><h2 className="system-card-title">Gas management</h2><p className="system-card-copy">Track LPG stock batches, record gas sales, manage customer debts, and understand your gross profit.</p></div>
        <div className="system-card-cta"><span>Open Gas workspace</span><ArrowUpRight size={18} /></div>
      </Link>
      <Link href="/pos" className="system-card" style={{ "--accent": "#16A34A", "--soft": "#EAF8EE" } as CSSProperties}>
        <div><div className="system-card-icon"><CreditCard size={24} /></div><h2 className="system-card-title">POS services</h2><p className="system-card-copy">Record withdrawals, deposits, transfers, airtime, data, and payments received for gas.</p></div>
        <div className="system-card-cta"><span>Open POS workspace</span><ArrowUpRight size={18} /></div>
      </Link>
    </div>
    <div className="system-footer"><span>VP Ventures Inventory System</span><span style={{ display: "flex", alignItems: "center", gap: 8 }}><Package size={14} /> Built for everyday business</span><span><ReceiptText size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />Private owner account</span></div>
  </div>;
}
