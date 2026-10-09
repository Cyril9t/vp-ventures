"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, Calculator, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/client-api";
import { PageHeader } from "@/components/shared/WorkspaceShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { formatNaira, formatKg } from "@/lib/money";

type Sale = { id: string; saleNumber: string; amount: number; quantityKg: number; costAmount: number; sellingPricePerKg: number; customerName: string | null; customerPhone: string | null; customerAddress: string | null; cashAmount: number; transferAmount: number; cardAmount: number; debtAmount: number; status: string };
type Settings = { gasPricePerKg: number };

export function GasSaleForm({ saleId }: { saleId?: string }) {
  const router = useRouter();
  const correction = Boolean(saleId);
  const [amount, setAmount] = useState("");
  const [cash, setCash] = useState("");
  const [transfer, setTransfer] = useState("");
  const [card, setCard] = useState("");
  const [debt, setDebt] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [reason, setReason] = useState("");
  const [price, setPrice] = useState(0);
  const [sale, setSale] = useState<Sale | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(correction);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!correction) { apiRequest<Settings>("/api/gas/settings").then((s) => setPrice(s.gasPricePerKg)).catch((e) => setError(e instanceof Error ? e.message : "Unable to load gas price.")); return; }
    apiRequest<Sale>(`/api/gas/sales/${saleId}`).then((record) => {
      setSale(record); setAmount(String(record.amount)); setCash(String(record.cashAmount)); setTransfer(String(record.transferAmount)); setCard(String(record.cardAmount)); setDebt(String(record.debtAmount)); setName(record.customerName ?? ""); setPhone(record.customerPhone ?? ""); setAddress(record.customerAddress ?? ""); setPrice(record.sellingPricePerKg);
    }).catch((e) => setError(e instanceof Error ? e.message : "Unable to load sale." )).finally(() => setLoading(false));
    // Correction deliberately uses the saved price snapshot returned by the sale record.
  }, [correction, saleId]);

  const total = Number(amount) || 0;
  const paid = (Number(cash) || 0) + (Number(transfer) || 0) + (Number(card) || 0) + (Number(debt) || 0);
  const matchedPayment = Math.abs(Math.round((paid - total) * 100)) < 1;
  const previewKg = price > 0 ? total / price : 0;
  const preview = useMemo(() => ({ kg: previewKg, cash: Number(cash) || 0, transfer: Number(transfer) || 0, card: Number(card) || 0, debt: Number(debt) || 0 }), [previewKg, cash, transfer, card, debt]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!matchedPayment) { toast.error("Payment breakdown must equal the sale amount."); return; }
    if (Number(debt) > 0 && (!name.trim() || !phone.trim() || !address.trim())) { toast.error("Customer name, phone, and address are required for debt."); return; }
    if (price <= 0) { toast.error("Set a valid current selling price in Gas Settings first."); return; }
    if (correction && !reason.trim()) { toast.error("Enter a reason for the correction."); return; }
    setBusy(true);
    const payload = { amount: total, cashAmount: preview.cash, transferAmount: preview.transfer, cardAmount: preview.card, debtAmount: preview.debt, customerName: name, customerPhone: phone, customerAddress: address, ...(correction ? { reason } : {}) };
    try {
      const result = await apiRequest<{ id: string }>(correction ? `/api/gas/sales/${saleId}/correct` : "/api/gas/sales", { method: correction ? "PATCH" : "POST", body: JSON.stringify(payload) });
      toast.success(correction ? "Sale correction saved." : "Gas sale recorded."); router.push(`/gas/sales/${result.id}`); router.refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to save this sale."); }
    finally { setBusy(false); }
  }

  if (loading) return <LoadingState label="Loading the original sale…" />;
  if (error) return <div className="notice">{error}</div>;
  return <>
    <PageHeader eyebrow={`GAS / SALES${correction ? " / CORRECTION" : ""}`} title={correction ? "Correct gas sale" : "Record gas sale"} description={correction ? `Correct ${sale?.saleNumber} while keeping its original selling-price snapshot.` : "Enter the amount the customer wants to buy. The system calculates the kilograms."} action={<Link href={correction ? `/gas/sales/${saleId}` : "/gas/sales"} className="button secondary"><ArrowLeft size={15} /> Cancel</Link>} />
    <div className="content-grid" style={{ gridTemplateColumns: "minmax(0, 1.35fr) minmax(265px, .8fr)" }}>
      <form className="surface" onSubmit={submit}>
        <div className="form-section"><h2 className="form-section-title">Sale amount</h2><p className="form-section-desc">The selling price per kilogram is {correction ? "the original recorded price" : "taken from Gas Settings"}; it cannot be overridden on this form.</p>
          <label className="field"><span className="field-label">Amount customer wants to buy (₦)</span><input className="input" type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 5000" required /><span className="field-hint">You enter the money amount, not kilograms.</span></label>
          <div className="amount-highlight" style={{ marginTop: 16 }}><div className="amount-highlight-label">Calculated quantity</div><div className="amount-highlight-value">{formatKg(previewKg)}</div><div className="field-hint" style={{ marginTop: 5 }}>At {formatNaira(price)} per kg</div></div>
        </div>
        <div className="form-section"><h2 className="form-section-title">Payment breakdown</h2><p className="form-section-desc">The full sale amount must be accounted for across these payment types.</p><div className="field-grid">
          <label className="field"><span className="field-label">Cash (₦)</span><input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="0.00" required /></label>
          <label className="field"><span className="field-label">Transfer (₦)</span><input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={transfer} onChange={(e) => setTransfer(e.target.value)} placeholder="0.00" required /></label>
          <label className="field"><span className="field-label">Card (₦)</span><input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={card} onChange={(e) => setCard(e.target.value)} placeholder="0.00" required /></label>
          <label className="field"><span className="field-label">Debt (₦)</span><input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={debt} onChange={(e) => setDebt(e.target.value)} placeholder="0.00" required /></label>
        </div>
        </div>
        <div className={`notice ${matchedPayment ? "success" : ""}`} style={{ marginTop: 16 }}>Payment total: <strong>{formatNaira(paid)}</strong> of <strong>{formatNaira(total)}</strong> {matchedPayment ? "— balanced" : "— the amounts do not match"}</div>
        {Number(debt) > 0 && <div className="field-grid" style={{ marginTop: 17 }}><label className="field"><span className="field-label">Customer name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></label><label className="field"><span className="field-label">Phone number</span><input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required /></label><label className="field full-span"><span className="field-label">Address</span><textarea className="textarea" value={address} onChange={(e) => setAddress(e.target.value)} required /></label></div>}
        {correction && <label className="field" style={{ padding: "0 20px 18px" }}><span className="field-label">Correction reason</span><textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} minLength={3} maxLength={240} placeholder="e.g. Incorrect amount entered" required /></label>}
        <div className="form-actions"><Link className="button secondary" href={correction ? `/gas/sales/${saleId}` : "/gas/sales"}>Cancel</Link><button className="button" type="submit" disabled={busy || !matchedPayment || total <= 0 || price <= 0}>{busy ? "Saving…" : <><CheckCircle2 size={16} /> {correction ? "Save correction" : "Confirm gas sale"}</>}</button></div>
      </form>
      <div className="list-stack">
        <section className="surface surface-pad"><div className="surface-heading" style={{ padding: 0, border: 0, marginBottom: 17 }}><div><h2 className="surface-title">Sale summary</h2><p className="surface-subtitle">Review before confirming</p></div><Calculator size={18} color="#a1a1aa" /></div>
          <div className="summary-list"><div className="summary-row"><span>Sale amount</span><strong>{formatNaira(total)}</strong></div><div className="summary-row"><span>Quantity</span><strong>{formatKg(previewKg)}</strong></div><div className="summary-row"><span>Selling price</span><strong>{formatNaira(price)}/kg</strong></div><div className="summary-row"><span>Cash</span><strong>{formatNaira(preview.cash)}</strong></div><div className="summary-row"><span>Transfer</span><strong>{formatNaira(preview.transfer)}</strong></div><div className="summary-row"><span>Card</span><strong>{formatNaira(preview.card)}</strong></div><div className="summary-row"><span>Debt</span><strong>{formatNaira(preview.debt)}</strong></div><div className="summary-row summary-total"><span>Remaining customer debt</span><strong>{formatNaira(preview.debt)}</strong></div></div>
          <p className="field-hint" style={{ marginTop: 18 }}>Final cost and gross profit are calculated on the server from actual FIFO batch costs and shown on the saved sale.</p>
        </section>
        <div className="notice neutral" style={{ display: "flex", gap: 8 }}><Info size={16} style={{ flexShrink: 0 }} /><span>On confirmation, stock deductions, sale values, payment breakdown, debt, and history are saved together. A failed step will not partially save the sale.</span></div>
      </div>
    </div>
  </>;
}
