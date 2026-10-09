"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CircleDollarSign, Flame, Gauge, Plus, UsersRound, Wallet } from "lucide-react";
import { PageHeader, StatCard, EmptyState } from "@/components/shared/WorkspaceShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusPill } from "@/components/shared/StatusPill";
import { apiRequest } from "@/lib/client-api";
import { formatNaira, formatKg } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";

type Dashboard = { today: { salesAmount: number; gasSoldKg: number; grossProfit: number; payments: { cash: number; transfer: number; card: number; debt: number } }; currentStockKg: number; outstandingDebt: number; currentSellingPricePerKg: number; businessName: string; recentSales: Array<{ id: string; saleNumber: string; customerName: string | null; amount: number; quantityKg: number; grossProfit: number; status: string; createdAt: string; debtStatus: string | null }> };

export function GasDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { apiRequest<Dashboard>("/api/gas/dashboard").then(setData).catch((e) => setError(e instanceof Error ? e.message : "Unable to load dashboard.")); }, []);
  if (error) return <div className="notice">{error}</div>;
  if (!data) return <LoadingState label="Loading gas operations…" />;
  const t = data.today;
  return <>
    <PageHeader eyebrow="GAS OVERVIEW" title="Gas dashboard" description="A clear picture of today's sales, stock and customer debt." action={<Link className="button" href="/gas/sales/new"><Plus size={16} /> Record gas sale</Link>} />
    <div className="stats-grid">
      <StatCard label="Today's sales" value={formatNaira(t.salesAmount)} note="Total value of sales today" icon={CircleDollarSign} />
      <StatCard label="Gas sold today" value={formatKg(t.gasSoldKg)} note="Calculated from recorded sales" icon={Flame} />
      <StatCard label="Today's gross profit" value={formatNaira(t.grossProfit)} note="Sales less gas cost, before overhead" icon={ArrowUpRight} />
      <StatCard label="Current stock" value={formatKg(data.currentStockKg)} note={`Current price ${formatNaira(data.currentSellingPricePerKg)}/kg`} icon={Gauge} />
    </div>
    <div className="content-grid">
      <section className="surface">
        <div className="surface-heading"><div><h2 className="surface-title">Recent gas sales</h2><p className="surface-subtitle">The latest recorded gas transactions</p></div><Link className="text-link" href="/gas/sales">View all</Link></div>
        <div style={{ padding: 16 }}>
          {data.recentSales.length ? <div className="list-stack">{data.recentSales.map((sale) => <Link href={`/gas/sales/${sale.id}`} className="record-card" key={sale.id}>
            <div className="record-top"><div><div className="record-title">{sale.saleNumber}</div><div className="record-meta">{sale.customerName || "Walk-in customer"} · {formatDateTime(sale.createdAt)}</div></div><div><div className="record-amount">{formatNaira(sale.amount)}</div><div className="record-meta" style={{ textAlign: "right" }}>{formatKg(sale.quantityKg)}</div></div></div>
            <div className="record-bottom"><span className="record-foot">Gross profit <strong style={{ color: "#166534" }}>{formatNaira(sale.grossProfit)}</strong></span><StatusPill status={sale.status} /></div>
          </Link>)}</div> : <EmptyState title="No gas sales yet" description="Your sales will appear here after the first sale is recorded." action={<Link href="/gas/sales/new" className="button"><Plus size={15} /> Record first sale</Link>} />}
        </div>
      </section>
      <div className="list-stack">
        <section className="surface surface-pad"><div className="surface-heading" style={{ padding: 0, border: 0, marginBottom: 20 }}><div><h2 className="surface-title">Payment breakdown</h2><p className="surface-subtitle">How today's sales were settled</p></div><Wallet size={18} color="#a1a1aa" /></div>
          <div className="stat-breakdown">{[["Cash", t.payments.cash], ["Transfer", t.payments.transfer], ["Card", t.payments.card], ["Debt", t.payments.debt]].map(([label, value]) => <div className="breakdown-row" key={String(label)}><span className="breakdown-label"><span className="breakdown-dot" style={label === "Debt" ? { background: "#d97706" } : undefined} />{label}</span><strong className="breakdown-value">{formatNaira(Number(value))}</strong></div>)}</div>
        </section>
        <section className="surface surface-pad"><div style={{ display: "flex", alignItems: "center", gap: 12 }}><div className="empty-icon" style={{ margin: 0 }}><UsersRound size={20} /></div><div><div className="detail-label">Outstanding gas debt</div><div style={{ fontSize: 23, fontWeight: 820, letterSpacing: "-.05em" }}>{formatNaira(data.outstandingDebt)}</div></div></div><p className="surface-subtitle" style={{ marginTop: 14 }}>Track customers with unpaid balances and record partial repayments.</p><Link className="text-link" href="/gas/debt" style={{ display: "inline-flex", marginTop: 13 }}>Review customer debts <ArrowDownRight size={14} /></Link></section>
        <section className="surface surface-pad"><div className="detail-label">Current retail price</div><div className="amount-highlight"><div className="amount-highlight-label">Selling price per kg</div><div className="amount-highlight-value text-black">{formatNaira(data.currentSellingPricePerKg)}</div></div><p className="surface-subtitle" style={{ marginTop: 12 }}>New sales use this price. Earlier sales retain their recorded price.</p><Link className="text-link" href="/gas/settings">Manage gas settings</Link></section>
      </div>
    </div>
  </>;
}
