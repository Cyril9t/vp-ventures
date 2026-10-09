"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Banknote, CircleDollarSign, Search, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState, StatCard } from "@/components/shared/WorkspaceShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusPill } from "@/components/shared/StatusPill";
import { apiRequest } from "@/lib/client-api";
import { formatNaira } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";

type Debt = { id: string; saleId: string; customerName: string; customerPhone: string; customerAddress: string; originalAmount: number; outstandingAmount: number; status: string; createdAt: string; updatedAt: string; sale: { saleNumber: string; createdAt: string }; lastPayment: { id: string; amount: number; paymentMethod: string; paidAt: string } | null };

export function DebtList() {
  const [debts, setDebts] = useState<Debt[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("OPEN");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() { setDebts(await apiRequest<Debt[]>("/api/gas/debts")); }
  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : "Unable to load debts.")); }, []);
  const filtered = useMemo(() => (debts ?? []).filter((d) => {
    const matchesQuery = `${d.customerName} ${d.customerPhone} ${d.sale.saleNumber}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "ALL" || filter === "OPEN" && ["OUTSTANDING", "PARTIALLY_PAID"].includes(d.status) || filter === "OUTSTANDING" && d.status === "OUTSTANDING" || filter === "PARTIALLY_PAID" && d.status === "PARTIALLY_PAID" || filter === "PAID" && d.status === "PAID";
    return matchesQuery && matchesFilter;
  }), [debts, query, filter]);
  async function pay(e: FormEvent<HTMLFormElement>, debtId: string) {
    e.preventDefault(); setBusy(true);
    try { await apiRequest(`/api/gas/debts/${debtId}/payments`, { method: "POST", body: JSON.stringify({ amount: Number(amount), paymentMethod: method, note }) }); toast.success("Debt repayment recorded."); setAmount(""); setNote(""); setExpanded(null); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Unable to record repayment."); }
    finally { setBusy(false); }
  }
  if (!debts) return error ? <div className="notice">{error}</div> : <LoadingState label="Loading customer debts…" />;
  const open = debts.filter((d) => ["OUTSTANDING", "PARTIALLY_PAID"].includes(d.status));
  const balance = open.reduce((sum, d) => sum + d.outstandingAmount, 0);
  return <>
    <PageHeader eyebrow="GAS / CUSTOMER ACCOUNTS" title="Customer debt" description="See outstanding balances and record partial or full repayments." />
    <div className="stats-grid cols-3"><StatCard label="Outstanding balance" value={formatNaira(balance)} note="Across unpaid customers" icon={CircleDollarSign} /><StatCard label="Customers owing" value={String(open.length)} note="With an unpaid balance" icon={UsersRound} /><StatCard label="Fully paid" value={String(debts.filter((d) => d.status === "PAID").length)} note="Kept in customer history" icon={Banknote} /></div>
    <div className="toolbar"><div className="toolbar-search"><Search size={16} /><input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer or sale number…" /></div><div className="filter-pills">{[["OPEN", "Unpaid"], ["ALL", "All"], ["OUTSTANDING", "Outstanding"], ["PARTIALLY_PAID", "Partially paid"], ["PAID", "Paid"]].map(([key, label]) => <button className={`filter-pill ${filter === key ? "active" : ""}`} key={key} onClick={() => setFilter(key)}>{label}</button>)}</div></div>
    {filtered.length ? <div className="list-stack">{filtered.map((debt) => <section className="record-card" key={debt.id}>
      <div className="record-top"><div><div className="record-title">{debt.customerName}</div><div className="record-meta">{debt.customerPhone} · {debt.sale.saleNumber}</div><div className="record-meta">Added {formatDateTime(debt.createdAt)}</div></div><div style={{ textAlign: "right" }}><div className="record-amount">{formatNaira(debt.outstandingAmount)}</div><div className="record-meta">of {formatNaira(debt.originalAmount)}</div></div></div>
      <div className="record-bottom"><StatusPill status={debt.status} /><span className="record-foot">{debt.lastPayment ? `Last payment ${formatDateTime(debt.lastPayment.paidAt)}` : "No repayment recorded"}</span></div>
      {debt.customerAddress && <div className="record-foot">Address: {debt.customerAddress}</div>}
      {debt.status !== "PAID" && <button className="button secondary full" onClick={() => { setExpanded(expanded === debt.id ? null : debt.id); setAmount(String(debt.outstandingAmount)); }} type="button">{expanded === debt.id ? "Close repayment form" : "Record repayment"}</button>}
      {expanded === debt.id && <form className="form-section" style={{ padding: 0, border: 0 }} onSubmit={(e) => pay(e, debt.id)}><div className="field-grid"><label className="field"><span className="field-label">Amount received (₦)</span><input className="input" type="number" min="0.01" max={debt.outstandingAmount} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></label><label className="field"><span className="field-label">Payment method</span><select className="select" value={method} onChange={(e) => setMethod(e.target.value)}><option value="CASH">Cash</option><option value="TRANSFER">Transfer</option><option value="CARD">Card</option></select></label><label className="field full-span"><span className="field-label">Note (optional)</span><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Payment note" maxLength={240} /></label></div><div className="dialog-actions"><button className="button" type="submit" disabled={busy}>{busy ? "Saving…" : "Confirm repayment"}</button></div></form>}
    </section>)}</div> : <EmptyState title="No debts match" description="There are no customers matching this filter, or your search did not find a record." />}
  </>;
}
