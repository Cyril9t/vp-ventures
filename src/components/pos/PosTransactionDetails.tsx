"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, FileText, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/WorkspaceShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusPill } from "@/components/shared/StatusPill";
import { ConfirmReasonDialog } from "@/components/shared/ConfirmReasonDialog";
import { apiRequest } from "@/lib/client-api";
import { formatNaira } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";

const serviceLabel = (value: string | null) => ({ CASH_WITHDRAWAL: "Cash withdrawal", CARD_WITHDRAWAL: "Card withdrawal", CASH_DEPOSIT: "Cash deposit", TRANSFER: "Transfer", AIRTIME: "Airtime", DATA: "Data", GAS_PAYMENT: "Gas payment" } as Record<string, string>)[value ?? ""] ?? "Transaction";
type PosRecord = { id: string; transactionNumber: string; category: string; service: string | null; amount: number; serviceCharge: number; total: number; status: string; paymentMethod: string | null; note: string | null; createdAt: string; voidedAt: string | null; voidReason: string | null; debtPayment: { id: string; debtId: string; amount: number; paymentMethod: string; paidAt: string; debt: { customerName: string; outstandingAmount: number; status: string } } | null };
export function PosTransactionDetails({ id }: { id: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<PosRecord | null>(null);
  const [error, setError] = useState("");
  async function load() { setRecord(await apiRequest<PosRecord>(`/api/pos/transactions/${id}`)); }
  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : "Unable to load transaction.")); }, [id]);
  async function voidTransaction(reason: string) {
    try { await apiRequest(`/api/pos/transactions/${id}/void`, { method: "POST", body: JSON.stringify({ reason }) }); toast.success("Transaction voided. Its history has been preserved."); await load(); router.refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Unable to void transaction."); throw e; }
  }
  if (!record) return error ? <div className="notice">{error}</div> : <LoadingState label="Loading transaction details…" />;
  return <>
    <PageHeader eyebrow="POS / TRANSACTION DETAILS" title={record.transactionNumber} description={`Recorded ${formatDateTime(record.createdAt)}. Review the saved amount, charge, and transaction status.`} action={<Link className="button secondary" href="/pos/history"><ArrowLeft size={15} /> Back to history</Link>} />
    {record.status === "VOIDED" && <div className="notice" style={{ marginBottom: 18 }}>This transaction has been voided. Reason: {record.voidReason || "No reason recorded."}</div>}
    <div className="stats-grid"><div className="stat-card"><div className="stat-head">Amount processed <span className="stat-icon"><CreditCard size={16} /></span></div><div className="stat-value">{formatNaira(record.amount)}</div><div className="stat-note">Customer transaction amount</div></div><div className="stat-card"><div className="stat-head">Service charge <span className="stat-icon"><ReceiptText size={16} /></span></div><div className="stat-value">{formatNaira(record.serviceCharge)}</div><div className="stat-note">Saved charge snapshot</div></div><div className="stat-card"><div className="stat-head">Total <span className="stat-icon"><FileText size={16} /></span></div><div className="stat-value">{formatNaira(record.total)}</div><div className="stat-note">Amount plus service charge</div></div><div className="stat-card"><div className="stat-head">Status <span className="stat-icon"><ReceiptText size={16} /></span></div><div style={{ marginTop: 16 }}><StatusPill status={record.status} /></div><div className="stat-note">Preserved financial history</div></div></div>
    <div className="content-grid"><section className="surface"><div className="surface-heading"><div><h2 className="surface-title">Transaction information</h2><p className="surface-subtitle">Core details recorded for this transaction</p></div><StatusPill status={record.status} /></div><div className="surface-pad"><div className="details-grid">{[["Reference", record.transactionNumber], ["Category", record.category === "GAS_PAYMENT" ? "Gas payment" : "POS service"], ["Service", serviceLabel(record.service)], ["Payment method", record.paymentMethod?.toLowerCase() ?? "—"], ["Date and time", formatDateTime(record.createdAt)], ["Service charge", formatNaira(record.serviceCharge)], ["Total", formatNaira(record.total)], ["Note", record.note || "—"]].map(([label, value]) => <div className="detail-item" key={label}><div className="detail-label">{label}</div><div className="detail-value">{value}</div></div>)}</div>
      {record.debtPayment && <div className="notice neutral" style={{ marginTop: 17 }}>This gas payment was applied to {record.debtPayment.debt.customerName}'s debt. Current outstanding balance: <strong>{formatNaira(record.debtPayment.debt.outstandingAmount)}</strong>.</div>}
    </div></section>
      {record.status !== "VOIDED" && <section className="surface surface-pad"><h2 className="surface-title">Actions</h2><p className="surface-subtitle" style={{ marginBottom: 15 }}>Any correction or void requires a reason and preserves the previous record.</p><div className="list-stack"><Link href={`/pos/history/${id}/correct`} className="button full">Correct transaction</Link><ConfirmReasonDialog title="Void this POS transaction?" description="The transaction will remain visible in history but be excluded from active POS totals. Linked debt repayments will be reversed when safe." confirmLabel="Void transaction" danger onConfirm={voidTransaction} /></div></section>}
    </div>
  </>;
}
