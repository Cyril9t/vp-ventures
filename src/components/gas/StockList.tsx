"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Package, Plus, Search, Weight } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shared/WorkspaceShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusPill } from "@/components/shared/StatusPill";
import { apiRequest } from "@/lib/client-api";
import { formatNaira, formatKg } from "@/lib/money";
import { formatDate } from "@/lib/dates";

type Batch = { id: string; batchNumber: string; purchaseDate: string; quantityPurchased: number; remainingQuantity: number; soldQuantity: number; costPricePerKg: number; expectedSellingPricePerKg: number; totalPurchaseCost: number; expectedRevenue: number; expectedGrossProfit: number; status: string };

export function StockList() {
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState("");
  useEffect(() => { apiRequest<Batch[]>("/api/gas/stock").then(setBatches).catch((e) => setError(e instanceof Error ? e.message : "Unable to load stock.")); }, []);
  const filtered = useMemo(() => (batches ?? []).filter((batch) => (filter === "ALL" || batch.status === filter) && `${batch.batchNumber} ${batch.purchaseDate}`.toLowerCase().includes(query.toLowerCase())), [batches, filter, query]);
  if (!batches) return error ? <div className="notice">{error}</div> : <LoadingState label="Loading stock batches…" />;
  const totalStock = batches.reduce((sum, b) => sum + b.remainingQuantity, 0);
  return <>
    <PageHeader eyebrow="GAS / INVENTORY" title="Stock batches" description="Every purchase is tracked separately so each batch keeps its own cost price." action={<Link className="button" href="/gas/stock/new"><Plus size={16} /> Add purchase</Link>} />
    <div className="stats-grid cols-3">
      <div className="stat-card"><div className="stat-head">Available stock <span className="stat-icon"><Weight size={16} /></span></div><div className="stat-value">{formatKg(totalStock)}</div><div className="stat-note">Across active batches</div></div>
      <div className="stat-card"><div className="stat-head">Active batches <span className="stat-icon"><Package size={16} /></span></div><div className="stat-value">{batches.filter((b) => b.status === "ACTIVE").length}</div><div className="stat-note">With stock remaining</div></div>
      <div className="stat-card"><div className="stat-head">Finished batches <span className="stat-icon"><CalendarDays size={16} /></span></div><div className="stat-value">{batches.filter((b) => b.status === "FINISHED").length}</div><div className="stat-note">Kept for purchase history</div></div>
    </div>
    <div className="toolbar"><div className="toolbar-search"><Search size={16} /><input className="input" placeholder="Search batch number…" value={query} onChange={(e) => setQuery(e.target.value)} /></div><div className="filter-pills">{[["ALL", "All batches"], ["ACTIVE", "Active"], ["FINISHED", "Finished"]].map(([value, label]) => <button key={value} className={`filter-pill ${filter === value ? "active" : ""}`} onClick={() => setFilter(value)}>{label}</button>)}</div></div>
    {filtered.length ? <div className="list-stack">{filtered.map((batch) => <Link href={`/gas/stock/${batch.id}`} className="record-card" key={batch.id}>
      <div className="record-top"><div><div className="record-title">{batch.batchNumber}</div><div className="record-meta">Purchased {formatDate(batch.purchaseDate)}</div></div><StatusPill status={batch.status} /></div>
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", margin: 0, gap: 12 }}><div><div className="detail-label">Remaining stock</div><div style={{ fontWeight: 800, fontSize: 16 }}>{formatKg(batch.remainingQuantity)}</div></div><div><div className="detail-label">Purchase quantity</div><div style={{ fontWeight: 740, fontSize: 13 }}>{formatKg(batch.quantityPurchased)}</div></div><div><div className="detail-label">Cost per kg</div><div style={{ fontWeight: 740, fontSize: 13 }}>{formatNaira(batch.costPricePerKg)}</div></div><div><div className="detail-label">Expected gross profit</div><div style={{ fontWeight: 740, color: batch.expectedGrossProfit >= 0 ? "#166534" : "#b91c1c", fontSize: 13 }}>{formatNaira(batch.expectedGrossProfit)}</div></div></div>
      <div className="record-bottom"><span className="record-foot">{formatNaira(batch.totalPurchaseCost)} total purchase cost</span><span className="text-link" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>Details <ChevronRight size={14} /></span></div>
    </Link>)}</div> : <EmptyState title={query ? "No matching batches" : "No stock purchases yet"} description={query ? "Try another batch number or change the filter." : "Add your first gas purchase to start tracking stock and cost."} action={!query ? <Link className="button" href="/gas/stock/new"><Plus size={15} /> Add purchase</Link> : undefined} />}
  </>;
}
