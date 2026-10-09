"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, ReceiptText, Search } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shared/WorkspaceShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusPill } from "@/components/shared/StatusPill";
import { apiRequest } from "@/lib/client-api";
import { formatNaira, formatKg } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";

type Sale = { id: string; saleNumber: string; customerName: string | null; customerPhone?: string | null; amount: number; quantityKg: number; sellingPricePerKg: number; costAmount: number; grossProfit: number; cashAmount: number; transferAmount: number; cardAmount: number; debtAmount: number; status: string; createdAt: string };
export function SalesList() {
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState("");
  useEffect(() => { apiRequest<Sale[]>("/api/gas/sales").then(setSales).catch((e) => setError(e instanceof Error ? e.message : "Unable to load sales.")); }, []);
  const filtered = useMemo(() => (sales ?? []).filter((s) => {
    const q = `${s.saleNumber} ${s.customerName ?? ""} ${s.customerPhone ?? ""}`.toLowerCase().includes(query.toLowerCase());
    const matches = filter === "ALL" || filter === "TODAY" && new Date(s.createdAt).toDateString() === new Date().toDateString() || filter === "CASH" && s.cashAmount > 0 || filter === "TRANSFER" && s.transferAmount > 0 || filter === "CARD" && s.cardAmount > 0 || filter === "DEBT" && s.debtAmount > 0 || filter === "VOIDED" && s.status === "VOIDED" || filter === "CORRECTED" && s.status === "CORRECTED";
    return q && matches;
  }), [sales, query, filter]);
  if (!sales) return error ? <div className="notice">{error}</div> : <LoadingState label="Loading gas sales…" />;
  return <>
    <PageHeader eyebrow="GAS / SALES" title="Gas sales" description="Search sales, check payment splits, and review transaction history." action={<Link href="/gas/sales/new" className="button"><Plus size={16} /> Record gas sale</Link>} />
    <div className="toolbar"><div className="toolbar-search"><Search size={16} /><input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search sale number or customer…" /></div><div className="filter-pills">{[["ALL", "All"], ["TODAY", "Today"], ["CASH", "Cash"], ["TRANSFER", "Transfer"], ["CARD", "Card"], ["DEBT", "Debt"], ["CORRECTED", "Corrected"], ["VOIDED", "Voided"]].map(([key, label]) => <button className={`filter-pill ${filter === key ? "active" : ""}`} key={key} onClick={() => setFilter(key)}>{label}</button>)}</div></div>
    {filtered.length ? <div className="list-stack">{filtered.map((sale) => <Link key={sale.id} href={`/gas/sales/${sale.id}`} className="record-card">
      <div className="record-top"><div><div className="record-title">{sale.saleNumber}</div><div className="record-meta">{sale.customerName || "Walk-in customer"} · {formatDateTime(sale.createdAt)}</div></div><div><div className="record-amount">{formatNaira(sale.amount)}</div><div className="record-meta" style={{ textAlign: "right" }}>{formatKg(sale.quantityKg)}</div></div></div>
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", margin: 0, gap: 12 }}><div><div className="detail-label">Gross profit</div><div style={{ fontSize: 13, fontWeight: 770, color: sale.status === "VOIDED" ? "#71717a" : "#166534" }}>{formatNaira(sale.grossProfit)}</div></div><div><div className="detail-label">Payment split</div><div style={{ fontSize: 11, fontWeight: 700, color: "#52525b" }}>{[sale.cashAmount && "Cash", sale.transferAmount && "Transfer", sale.cardAmount && "Card", sale.debtAmount && "Debt"].filter(Boolean).join(" + ") || "—"}</div></div></div>
      <div className="record-bottom"><span className="record-foot">Cost {formatNaira(sale.costAmount)} · Price {formatNaira(sale.sellingPricePerKg)}/kg</span><StatusPill status={sale.status} /></div>
    </Link>)}</div> : <EmptyState title={query ? "No matching sales" : "No sales to show"} description="Try changing your search or filter, or record a new gas sale." action={<Link className="button" href="/gas/sales/new"><Plus size={15} /> Record gas sale</Link>} />}
  </>;
}
