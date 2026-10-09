"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeftRight, CircleUserRound, CreditCard, Flame, LayoutDashboard, LogOut, Menu, Package, ReceiptText, Settings2, UsersRound } from "lucide-react";
import { apiRequest } from "@/lib/client-api";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { toast } from "sonner";

type Workspace = "gas" | "pos";

const workspaceConfig = {
  gas: {
    name: "Gas workspace",
    title: "Gas",
    accent: "#F97316",
    soft: "#FFF1E7",
    icon: Flame,
    nav: [
      { label: "Home", href: "/gas", icon: LayoutDashboard },
      { label: "Stock", href: "/gas/stock", icon: Package },
      { label: "Sales", href: "/gas/sales", icon: ReceiptText },
      { label: "Debt", href: "/gas/debt", icon: UsersRound },
      { label: "Settings", href: "/gas/settings", icon: Settings2 },
    ],
  },
  pos: {
    name: "POS workspace",
    title: "POS",
    accent: "#16A34A",
    soft: "#EAF8EE",
    icon: CreditCard,
    nav: [
      { label: "Home", href: "/pos", icon: LayoutDashboard },
      { label: "Transactions", href: "/pos/transactions", icon: CreditCard },
      { label: "History", href: "/pos/history", icon: ReceiptText },
      { label: "Settings", href: "/pos/settings", icon: Settings2 },
    ],
  },
} as const;

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className="brand-lockup">
      <div className="brand-symbol"><Flame size={20} strokeWidth={2.2} /></div>
      <div>
        <div className="brand-name" style={light ? { color: "white" } : undefined}>VP VENTURES</div>
        <div className="brand-caption" style={light ? { color: "#a1a1aa" } : undefined}>Inventory System</div>
      </div>
    </div>
  );
}

export function WorkspaceShell({ workspace, children }: { workspace: Workspace; children: ReactNode }) {
  const config = workspaceConfig[workspace];
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const style = { "--workspace-accent": config.accent, "--workspace-soft": config.soft } as CSSProperties;

  async function logout() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST", body: "{}" });
      router.replace("/login");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to log out.");
    }
  }

  return (
    <div className="workspace-shell" style={style}>
      {open && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Brand />
        <div className="workspace-tag"><span className="workspace-dot" />{config.name}</div>
        <nav className="nav-stack" aria-label={`${config.title} navigation`}>
          {config.nav.map((item) => {
            const Icon = item.icon;
            const active = item.href === `/${workspace}` ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`nav-link ${active ? "active" : ""}`}>
                <Icon size={18} strokeWidth={active ? 2.3 : 1.8} /> <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/" onClick={() => setOpen(false)} className="switch-link"><ArrowLeftRight size={16} /> Switch system</Link>
          <Link href="/account" onClick={() => setOpen(false)} className="nav-link"><CircleUserRound size={18} /> Account & security</Link>
          <button className="nav-link" onClick={logout}><LogOut size={18} /> Log out</button>
          <div className="sidebar-footnote">VP Ventures · Private workspace</div>
        </div>
      </aside>

      <section className="workspace-main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-button " aria-label="Open navigation" onClick={() => setOpen(true)}><Menu size={19} color="black" /></button>
            <div>
              <div className="topbar-label">VP Ventures / {config.title}</div>
              <div className="topbar-title">{config.title} workspace</div>
            </div>
          </div>
          <div className="topbar-right">
            <span className="status-pill" style={{ color: config.accent, background: config.soft }}>● Live workspace</span>
            <ThemeToggle compact />
            <Link href="/account" className="account-link" aria-label="Account and security"><CircleUserRound size={19} /></Link>
          </div>
        </header>
        <main className="main-content">{children}</main>
      </section>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1 className="page-title">{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action}</div>;
}

export function StatCard({ label, value, note, icon: Icon, tint }: { label: string; value: string; note?: string; icon: typeof Flame; tint?: string }) {
  return <div className="stat-card"><div className="stat-head"><span>{label}</span><span className="stat-icon" style={tint ? { color: tint } : undefined}><Icon size={17} /></span></div><div className="stat-value">{value}</div>{note && <div className="stat-note">{note}</div>}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><Package size={22} /></div><div className="empty-title">{title}</div><p className="empty-description">{description}</p>{action}</div>;
}
