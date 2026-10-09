"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Info, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/client-api";
import { PageHeader } from "@/components/shared/WorkspaceShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { formatNaira } from "@/lib/money";

const services = [
  ["CASH_WITHDRAWAL", "Cash withdrawal"], ["CARD_WITHDRAWAL", "Card withdrawal"], ["CASH_DEPOSIT", "Cash deposit"], ["TRANSFER", "Transfer"], ["AIRTIME", "Airtime"], ["DATA", "Data"],
] as const;
type ChargeRule = { id: string; service: string; minimumAmount: number; maximumAmount: number | null; serviceCharge: number; active: boolean };
type Debt = { id: string; customerName: string; customerPhone: string; outstandingAmount: number; status: string };
type Transaction = { id: string; transactionNumber: string; category: "POS_SERVICE" | "GAS_PAYMENT"; service: string | null; amount: number; serviceCharge: number; total: number; paymentMethod: string | null; note: string | null; status: string; debtPayment?: { debtId: string } | null };

export function PosTransactionForm({ initialService, transactionId }: { initialService?: string; transactionId?: string }) {
  const router = useRouter();
  const correcting = Boolean(transactionId);
  const [category, setCategory] = useState<"POS_SERVICE" | "GAS_PAYMENT">(initialService === "GAS_PAYMENT" ? "GAS_PAYMENT" : "POS_SERVICE");
  const [service, setService] = useState<string>(services.some(([v]) => v === initialService) ? initialService! : "CASH_WITHDRAWAL");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [debtId, setDebtId] = useState("");
  const [reason, setReason] = useState("");
  const [rules, setRules] = useState<ChargeRule[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [record, setRecord] = useState<Transaction | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(correcting);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([apiRequest<ChargeRule[]>("/api/pos/charge-rules"), apiRequest<Debt[]>("/api/gas/debts")])
      .then(([loadedRules, loadedDebts]) => { setRules(loadedRules); setDebts(loadedDebts.filter((d) => d.status === "OUTSTANDING" || d.status === "PARTIALLY_PAID")); })
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load form information."));
    if (correcting && transactionId) {
      apiRequest<Transaction>(`/api/pos/transactions/${transactionId}`).then((tx) => {
        setRecord(tx); setCategory(tx.category); setService(tx.service ?? "CASH_WITHDRAWAL"); setAmount(String(tx.amount)); setPaymentMethod(tx.paymentMethod ?? "CASH"); setNote(tx.note ?? "");
        if (tx.debtPayment) setDebtId(tx.debtPayment.debtId);
      }).catch((e) => setError(e instanceof Error ? e.message : "Unable to load transaction.")).finally(() => setLoading(false));
    }
  }, [correcting, transactionId]);

  const numericAmount = Number(amount) || 0;
  const applicableRule = rules.find((r) => r.active && r.service === service && numericAmount >= r.minimumAmount && (r.maximumAmount === null || numericAmount <= r.maximumAmount));
  const charge = category === "GAS_PAYMENT" ? 0 : applicableRule?.serviceCharge ?? null;
  const total = charge === null ? numericAmount : numericAmount + charge;
  const selectedDebt = debts.find((d) => d.id === debtId);
  const canRecord = numericAmount > 0 && paymentMethod && (category === "GAS_PAYMENT" || charge !== null) && (!selectedDebt || numericAmount <= selectedDebt.outstandingAmount);
  const selectedServiceLabel = category === "GAS_PAYMENT" ? "Gas payment" : services.find(([v]) => v === service)?.[1] ?? "POS service";

  const serviceNote = useMemo(() => category === "GAS_PAYMENT" ? "Gas payments never incur a POS service charge." : charge === null ? "No active charge rule covers this amount. Update charge rules in Settings." : `Charge rule applied: ${formatNaira(charge)}.`, [category, charge]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canRecord) { toast.error(category === "POS_SERVICE" && charge === null ? "No active charge rule covers this amount." : "Check the transaction amount and details."); return; }
    if (correcting && reason.trim().length < 3) { toast.error("A correction reason is required."); return; }
    setBusy(true);
    const payload = { category, ...(category === "POS_SERVICE" ? { service } : {}), amount: numericAmount, paymentMethod, note, ...(category === "GAS_PAYMENT" && debtId ? { debtId } : {}), ...(correcting ? { reason } : {}) };
    try {
      const result = await apiRequest<{ id: string }>(correcting ? `/api/pos/transactions/${transactionId}/correct` : "/api/pos/transactions", { method: correcting ? "PATCH" : "POST", body: JSON.stringify(payload) });
      toast.success(correcting ? "Transaction correction saved." : "Transaction recorded."); router.push(`/pos/history/${result.id}`); router.refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to save the transaction."); }
    finally { setBusy(false); }
  }

  if (loading) return <LoadingState label="Loading original transaction…" />;
  if (error) return <div className="notice">{error}</div>;
  return <>
    <PageHeader eyebrow={`POS / ${correcting ? "CORRECTION" : "NEW TRANSACTION"}`} title={correcting ? "Correct transaction" : "Record transaction"} description={correcting ? `Update ${record?.transactionNumber} and preserve the original audit history.` : "Choose what the payment is for, enter the amount, and review the charge before saving."} action={<Link className="button secondary" href={correcting ? `/pos/history/${transactionId}` : "/pos/transactions"}><ArrowLeft size={15} /> Cancel</Link>} />
    <div className="content-grid" style={{ gridTemplateColumns: "minmax(0, 1.35fr) minmax(265px, .8fr)" }}>
      <form className="surface" onSubmit={submit}>
        {!correcting && <div className="form-section"><h2 className="form-section-title">Transaction purpose</h2><p className="form-section-desc">Keep POS service revenue separate from money received for gas.</p><div className="category-toggle"><button type="button" className={category === "POS_SERVICE" ? "selected" : ""} onClick={() => { setCategory("POS_SERVICE"); setDebtId(""); }}>POS service</button><button type="button" className={category === "GAS_PAYMENT" ? "selected" : ""} onClick={() => { setCategory("GAS_PAYMENT"); setDebtId(""); }}>Gas payment</button></div>
          {category === "POS_SERVICE" && <label className="field" style={{ marginTop: 18 }}><span className="field-label">POS service</span><select className="select" value={service} onChange={(e) => setService(e.target.value)}>{services.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
        </div>}
        <div className="form-section"><h2 className="form-section-title">Transaction details</h2><p className="form-section-desc">{category === "GAS_PAYMENT" ? "This records money received for gas. The service charge is always ₦0." : "The service charge is selected automatically from the configured amount range."}</p>
          <div className="field-grid"><label className="field full-span"><span className="field-label">Amount processed (₦)</span><input className="input" type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" required /></label><label className="field"><span className="field-label">Payment method</span><select className="select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} required><option value="CASH">Cash</option><option value="TRANSFER">Transfer</option><option value="CARD">Card</option></select></label><label className="field"><span className="field-label">Note (optional)</span><input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={240} placeholder="Add a note" /></label></div>
          {category === "GAS_PAYMENT" && <label className="field" style={{ marginTop: 17 }}><span className="field-label">Link an existing gas debt (optional)</span><select className="select" value={debtId} onChange={(e) => setDebtId(e.target.value)}><option value="">Standalone gas payment</option>{debts.map((d) => <option key={d.id} value={d.id}>{d.customerName} — outstanding {formatNaira(d.outstandingAmount)}</option>)}</select><span className="field-hint">When a debt is selected, the payment reduces that debt. Otherwise this is recorded as a standalone gas payment.</span></label>}
          {correcting && <label className="field" style={{ marginTop: 17 }}><span className="field-label">Correction reason</span><textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} maxLength={240} placeholder="Explain the correction" /></label>}
          <div className={`notice ${charge === null && category === "POS_SERVICE" ? "" : "success"}`} style={{ marginTop: 16, display: "flex", gap: 8 }}><Info size={16} style={{ flexShrink: 0 }} /><span>{serviceNote}</span></div>
        </div>
        <div className="form-actions"><Link className="button secondary" href={correcting ? `/pos/history/${transactionId}` : "/pos/transactions"}>Cancel</Link><button className="button" type="submit" disabled={busy || !canRecord}>{busy ? "Saving…" : <><CheckCircle2 size={16} /> {correcting ? "Save correction" : "Confirm transaction"}</>}</button></div>
      </form>
      <div className="list-stack"><section className="surface surface-pad"><div className="surface-heading" style={{ padding: 0, border: 0, marginBottom: 17 }}><div><h2 className="surface-title">Review transaction</h2><p className="surface-subtitle">Amounts that will be saved</p></div><ReceiptText size={18} color="#a1a1aa" /></div>
        <div className="amount-highlight"><div className="amount-highlight-label">{selectedServiceLabel}</div><div className="amount-highlight-value">{formatNaira(numericAmount)}</div></div>
        <div className="summary-list" style={{ marginTop: 20 }}><div className="summary-row"><span>Amount processed</span><strong>{formatNaira(numericAmount)}</strong></div><div className="summary-row"><span>Service charge</span><strong>{charge === null ? "Not available" : formatNaira(charge)}</strong></div><div className="summary-row summary-total"><span>Total</span><strong>{charge === null ? "—" : formatNaira(total)}</strong></div><div className="summary-row"><span>Payment method</span><strong>{paymentMethod.toLowerCase()}</strong></div>{selectedDebt && <div className="summary-row"><span>Customer</span><strong>{selectedDebt.customerName}</strong></div>}</div>
        {category === "GAS_PAYMENT" && <div className="notice neutral" style={{ marginTop: 17 }}>Gas Payment · ₦0 service charge. This will not appear as POS service revenue.</div>}
      </section><div className="notice neutral">The server recalculates service charges, validates input and updates linked gas debt within a database transaction.</div></div>
    </div>
  </>;
}
