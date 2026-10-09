"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, CreditCard, Plus, ReceiptText, Smartphone, Wallet } from "lucide-react";
import { PageHeader, StatCard, EmptyState } from "@/components/shared/WorkspaceShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusPill } from "@/components/shared/StatusPill";
import { apiRequest } from "@/lib/client-api";
import { formatNaira } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";

const labelFor = (value: string | null) => ({ CASH_WITHDRAWAL: "Cash withdrawal", CARD_WITHDRAWAL: "Card withdrawal", CASH_DEPOSIT: "Cash deposit", TRANSFER: "Transfer", AIRTIME: "Airtime", DATA: "Data", GAS_PAYMENT: "Gas payment" } as Record<string, string>)[value ?? ""] ?? "Transaction";
type Dashboard = { today: { totalTransactions: number; amountProcessed: number; serviceRevenue: number; gasPayments: number }; serviceBreakdown: Record<string, number>; outstandingGasDebt: number; recentTransactions: Array<{ id: string; transactionNumber: string; category: string; service: string | null; amount: number; serviceCharge: number; total: number; status: string; paymentMethod: string | null; createdAt: string; customerName: string | null }> };
export function PosDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { apiRequest<Dashboard>("/api/pos/dashboard").then(setData).catch((e) => setError(e instanceof Error ? e.message : "Unable to load POS dashboard.")); }, []);
  if (error) return <div className="notice">{error}</div>;
  if (!data) return <LoadingState label="Loading POS activity…" />;
  return <>
    <PageHeader eyebrow="POS OVERVIEW" title="POS dashboard" description="Monitor today's transaction activity and service-charge income." action={<Link className="button" href="/pos/transactions/new"><Plus size={16} /> Record transaction</Link>} />
    <div className="stats-grid"><StatCard label="Transactions today" value={String(data.today.totalTransactions)} note="Completed or corrected records" icon={Activity} /><StatCard label="Amount processed" value={formatNaira(data.today.amountProcessed)} note="Transaction amounts, not cash balance" icon={Wallet} /><StatCard label="POS service revenue" value={formatNaira(data.today.serviceRevenue)} note="Service charges only" icon={ArrowUpRight} /><StatCard label="Gas payments" value={formatNaira(data.today.gasPayments)} note="Recorded separately, ₦0 service charge" icon={ReceiptText} /></div>
    <div className="content-grid"><section className="surface"><div className="surface-heading"><div><h2 className="surface-title">Recent transactions</h2><p className="surface-subtitle">Most recent POS service and gas payment records</p></div><Link href="/pos/history" className="text-link">View history</Link></div>
      {data.recentTransactions.length ? <div className="recent-dashboard-list">{data.recentTransactions.map((tx) => <Link href={`/pos/history/${tx.id}`} className="recent-dashboard-row" key={tx.id}><div className="recent-primary"><div className="recent-type-icon">{tx.category === "GAS_PAYMENT" ? <ReceiptText size={16} /> : <CreditCard size={16} />}</div><div className="recent-primary-text"><div className="record-title">{labelFor(tx.service)}</div><div className="record-meta">{tx.transactionNumber} · {formatDateTime(tx.createdAt)}</div></div></div><div className="recent-money"><strong>{formatNaira(tx.amount)}</strong><span className="record-meta">Charge {formatNaira(tx.serviceCharge)}</span></div></Link>)}</div> : <div style={{ padding: 18 }}><EmptyState title="No POS transactions yet" description="Record your first POS service or gas payment to see it here." action={<Link className="button" href="/pos/transactions/new"><Plus size={15} /> Record transaction</Link>} /></div>}
    </section>
    <div className="list-stack"><section className="surface surface-pad"><div className="surface-heading" style={{ padding: 0, border: 0, marginBottom: 18 }}><div><h2 className="surface-title">Service activity</h2><p className="surface-subtitle">Today's count by service</p></div><Smartphone size={18} color="#a1a1aa" /></div>{Object.entries(data.serviceBreakdown).length ? <div className="stat-breakdown">{Object.entries(data.serviceBreakdown).map(([service, count]) => <div className="breakdown-row" key={service}><span className="breakdown-label"><span className="breakdown-dot" />{labelFor(service)}</span><strong className="breakdown-value">{count}</strong></div>)}</div> : <p className="field-hint">Service activity will appear after transactions are recorded.</p>}</section>
      <section className="surface surface-pad"><div className="detail-label">Outstanding gas debt</div><div style={{ fontSize: 25, fontWeight: 820, letterSpacing: "-.05em", marginTop: 7 }}>{formatNaira(data.outstandingGasDebt)}</div><p className="surface-subtitle" style={{ marginTop: 10 }}>Gas debt is tracked in the Gas workspace, not counted as POS service revenue.</p><Link className="text-link" href="/gas/debt" style={{ display: "inline-flex", marginTop: 12 }}>Open debt records</Link></section>
    </div></div>
  </>;
}
