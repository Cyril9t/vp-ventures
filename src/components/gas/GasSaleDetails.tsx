"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarClock, CircleDollarSign, FileCheck2, Flame, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/WorkspaceShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusPill } from "@/components/shared/StatusPill";
import { ConfirmReasonDialog } from "@/components/shared/ConfirmReasonDialog";
import { apiRequest } from "@/lib/client-api";
import { formatNaira, formatKg } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";

type Sale = { id: string; saleNumber: string; customerName: string | null; customerPhone: string | null; customerAddress: string | null; amount: number; quantityKg: number; sellingPricePerKg: number; costAmount: number; grossProfit: number; cashAmount: number; transferAmount: number; cardAmount: number; debtAmount: number; status: string; createdAt: string; voidedAt: string | null; voidReason: string | null; allocations: Array<{ id: string; quantityKg: number; costPricePerKg: number; costAmount: number; stockBatch: { batchNumber: string } }>; debt: { id: string; originalAmount: number; outstandingAmount: number; status: string; payments: Array<{ id: string; amount: number; paymentMethod: string; paidAt: string; note: string | null }> } | null };

export function GasSaleDetails({ id }: { id: string }) {
  const router = useRouter();
  const [sale, setSale] = useState<Sale | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() { const record = await apiRequest<Sale>(`/api/gas/sales/${id}`); setSale(record); }
  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : "Unable to load sale.")); }, [id]);
  async function voidSale(reason: string) {
    setBusy(true);
    try { await apiRequest(`/api/gas/sales/${id}/void`, { method: "POST", body: JSON.stringify({ reason }) }); toast.success("Sale voided. Stock was restored and history preserved."); await load(); router.refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Unable to void sale."); throw e; }
    finally { setBusy(false); }
  }
  if (!sale) return error ? <div className="notice">{error}</div> : <LoadingState label="Loading sale details…" />;
  return <>
    <PageHeader eyebrow="GAS / SALES DETAILS" title={sale.saleNumber} description={`Recorded ${formatDateTime(sale.createdAt)}. Transaction details and stock costing are preserved here.`} action={<Link href="/gas/sales" className="button secondary"><ArrowLeft size={15} /> Back to sales</Link>} />
    {sale.status === "VOIDED" && <div className="notice" style={{ marginBottom: 18 }}>This transaction was voided and is excluded from active sales totals. Reason: {sale.voidReason || "No reason recorded."}</div>}
    {sale.status === "CORRECTED" && <div className="notice neutral" style={{ marginBottom: 18 }}>This sale has been corrected. Its correction history is retained in the audit log.</div>}
    <div className="stats-grid"><div className="stat-card"><div className="stat-head">Sale amount <span className="stat-icon"><CircleDollarSign size={16} /></span></div><div className="stat-value">{formatNaira(sale.amount)}</div><div className="stat-note">Sale revenue, including debt portion</div></div><div className="stat-card"><div className="stat-head">Gas sold <span className="stat-icon"><Flame size={16} /></span></div><div className="stat-value">{formatKg(sale.quantityKg)}</div><div className="stat-note">At {formatNaira(sale.sellingPricePerKg)}/kg</div></div><div className="stat-card"><div className="stat-head">Cost of gas <span className="stat-icon"><FileCheck2 size={16} /></span></div><div className="stat-value">{formatNaira(sale.costAmount)}</div><div className="stat-note">Calculated using FIFO batch costs</div></div><div className="stat-card"><div className="stat-head">Gross profit <span className="stat-icon"><ArrowUpRight size={16} /></span></div><div className="stat-value" style={{ color: sale.status === "VOIDED" ? "#71717a" : sale.grossProfit < 0 ? "#b91c1c" : "#166534" }}>{formatNaira(sale.grossProfit)}</div><div className="stat-note">Before operating expenses</div></div></div>
    <div className="content-grid">
      <div className="list-stack">
        <section className="surface"><div className="surface-heading"><div><h2 className="surface-title">Transaction details</h2><p className="surface-subtitle">Saved amount, payment split and customer information</p></div><StatusPill status={sale.status} /></div><div className="surface-pad">
          <div className="details-grid">{[["Sale number", sale.saleNumber], ["Recorded at", formatDateTime(sale.createdAt)], ["Selling price snapshot", `${formatNaira(sale.sellingPricePerKg)} / kg`], ["Quantity", formatKg(sale.quantityKg)], ["Cash received", formatNaira(sale.cashAmount)], ["Transfer received", formatNaira(sale.transferAmount)], ["Card received", formatNaira(sale.cardAmount)], ["Debt portion", formatNaira(sale.debtAmount)]].map(([label, value]) => <div className="detail-item" key={label}><div className="detail-label">{label}</div><div className="detail-value">{value}</div></div>)}</div>
          <div className="record-bottom" style={{ marginTop: 15 }}><div className="breakdown-label"><UserRound size={16} /><span>{sale.customerName || "Walk-in customer"}</span></div><span className="record-foot">{sale.customerPhone || "No phone recorded"}</span></div>{sale.customerAddress && <div className="detail-item"><div className="detail-label">Customer address</div><div className="detail-value">{sale.customerAddress}</div></div>}
        </div></section>
        <section className="surface"><div className="surface-heading"><div><h2 className="surface-title">Stock batches consumed</h2><p className="surface-subtitle">The sale can use more than one batch under FIFO</p></div></div><div className="surface-pad">{sale.allocations.length ? <div className="list-stack">{sale.allocations.map((a) => <div className="record-card" key={a.id}><div className="record-top"><div><div className="record-title">{a.stockBatch.batchNumber}</div><div className="record-meta">Cost {formatNaira(a.costPricePerKg)}/kg</div></div><div className="record-amount">{formatKg(a.quantityKg)}</div></div><div className="record-bottom"><span className="record-foot">Cost allocated</span><strong className="record-foot">{formatNaira(a.costAmount)}</strong></div></div>)}</div> : <div className="field-hint">No active stock allocations are attached to this transaction.</div>}</div></section>
      </div>
      <div className="list-stack">
        <section className="surface surface-pad"><div style={{ display: "flex", gap: 11, alignItems: "center", marginBottom: 18 }}><div className="empty-icon" style={{ margin: 0 }}><CalendarClock size={20} /></div><div><h2 className="surface-title">Customer debt</h2><p className="surface-subtitle">Outstanding amount connected to this sale</p></div></div>
          {sale.debt && sale.debt.status !== "CANCELLED" ? <><div className="amount-highlight"><div className="amount-highlight-label">Outstanding balance</div><div className="amount-highlight-value">{formatNaira(sale.debt.outstandingAmount)}</div><div style={{ marginTop: 8 }}><StatusPill status={sale.debt.status} /></div></div><div className="summary-list" style={{ marginTop: 18 }}><div className="summary-row"><span>Original debt</span><strong>{formatNaira(sale.debt.originalAmount)}</strong></div><div className="summary-row"><span>Repayments</span><strong>{sale.debt.payments.length}</strong></div></div><Link href="/gas/debt" className="button full" style={{ marginTop: 17 }}>Open debt management</Link></> : <div className="field-hint">No outstanding customer debt is linked to this sale.</div>}
          {sale.debt && sale.debt.payments.length > 0 && <div className="list-stack" style={{ marginTop: 18 }}>{sale.debt.payments.map((payment) => <div className="record-card" key={payment.id}><div className="record-top"><div><div className="record-title">{payment.paymentMethod.toLowerCase()} repayment</div><div className="record-meta">{formatDateTime(payment.paidAt)}</div></div><div className="record-amount">{formatNaira(payment.amount)}</div></div>{payment.note && <div className="record-foot">{payment.note}</div>}</div>)}</div>}
        </section>
        {sale.status !== "VOIDED" && <section className="surface surface-pad"><h2 className="surface-title">Actions</h2><p className="surface-subtitle" style={{ marginBottom: 15 }}>Corrections and voids are audited and never delete the original history.</p><div className="list-stack"><Link className="button full" href={`/gas/sales/${id}/correct`}>Correct transaction</Link><ConfirmReasonDialog title="Void this gas sale?" description="The sale will be excluded from active financial totals. Stock and any eligible debt balance will be reconciled." confirmLabel={busy ? "Voiding…" : "Void sale"} danger onConfirm={voidSale} /></div>{sale.debt?.payments.length ? <div className="notice" style={{ marginTop: 14 }}>This sale has debt repayments. Correct or void is blocked until those repayments are reconciled.</div> : null}</section>}
      </div>
    </div>
  </>;
}
