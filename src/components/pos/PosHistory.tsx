"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, ReceiptText, Search } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shared/WorkspaceShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusPill } from "@/components/shared/StatusPill";
import { apiRequest } from "@/lib/client-api";
import { formatNaira } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";

const serviceLabel = (value: string | null) => ({ CASH_WITHDRAWAL: "Cash withdrawal", CARD_WITHDRAWAL: "Card withdrawal", CASH_DEPOSIT: "Cash deposit", TRANSFER: "Transfer", AIRTIME: "Airtime", DATA: "Data", GAS_PAYMENT: "Gas payment" } as Record<string, string>)[value ?? ""] ?? "Transaction";
type PosRecord = { id: string; transactionNumber: string; category: string; service: string | null; amount: number; serviceCharge: number; total: number; status: string; paymentMethod: string | null; createdAt: string; linkedCustomer: string | null };
export function PosHistory() {
  const [records, setRecords] = useState<PosRecord[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState("");
  useEffect(() => { apiRequest<PosRecord[]>("/api/pos/transactions").then(setRecords).catch((e) => setError(e instanceof Error ? e.message : "Unable to load transaction history.")); }, []);
  const filtered = useMemo(() => (records ?? []).filter((r) => {
    const matchesSearch = `${r.transactionNumber} ${serviceLabel(r.service)} ${r.linkedCustomer ?? ""}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "ALL" || filter === "POS_SERVICES" && r.category === "POS_SERVICE" || filter === "GAS_PAYMENTS" && r.category === "GAS_PAYMENT" || filter === r.status;
    return matchesSearch && matchesFilter;
  }), [records, query, filter]);
  if (!records) return error ? <div className="notice">{error}</div> : <LoadingState label="Loading POS history…" />;
  return <>
    <PageHeader eyebrow="POS / HISTORY" title="Transaction history" description="Review POS service activity and gas payments, including corrected and voided records." action={<Link className="button" href="/pos/transactions/new"><Plus size={16} /> Record transaction</Link>} />
    <div className="toolbar"><div className="toolbar-search"><Search size={16} /><input className="input" placeholder="Search transaction or customer…" value={query} onChange={(e) => setQuery(e.target.value)} /></div><div className="filter-pills">{[["ALL", "All"], ["POS_SERVICES", "POS services"], ["GAS_PAYMENTS", "Gas payments"], ["COMPLETED", "Completed"], ["CORRECTED", "Corrected"], ["VOIDED", "Voided"]].map(([key, label]) => <button className={`filter-pill ${filter === key ? "active" : ""}`} key={key} onClick={() => setFilter(key)}>{label}</button>)}</div></div>
    {filtered.length ? <div className="list-stack">{filtered.map((r) => <Link key={r.id} href={`/pos/history/${r.id}`} className="record-card"><div className="record-top"><div><div className="record-title">{serviceLabel(r.service)}</div><div className="record-meta">{r.transactionNumber} · {formatDateTime(r.createdAt)}</div>{r.linkedCustomer && <div className="record-meta">Customer: {r.linkedCustomer}</div>}</div><div><div className="record-amount">{formatNaira(r.amount)}</div><div className="record-meta" style={{ textAlign: "right" }}>{r.category === "GAS_PAYMENT" ? "Gas payment" : "POS service"}</div></div></div><div className="stats-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", margin: 0, gap: 12 }}><div><div className="detail-label">Service charge</div><div style={{ fontSize: 13, fontWeight: 760 }}>{formatNaira(r.serviceCharge)}</div></div><div><div className="detail-label">Total</div><div style={{ fontSize: 13, fontWeight: 780 }}>{formatNaira(r.total)}</div></div></div><div className="record-bottom"><span className="record-foot">{r.paymentMethod ? `Paid by ${r.paymentMethod.toLowerCase()}` : "No payment method"}</span><StatusPill status={r.status} /></div></Link>)}</div> : <EmptyState title="No transactions found" description="Change the filters or record a transaction to build your history." action={<Link className="button" href="/pos/transactions/new"><Plus size={15} /> Record transaction</Link>} />}
  </>;
}
