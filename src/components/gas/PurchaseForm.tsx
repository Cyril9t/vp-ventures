"use client";
import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/client-api";
import { PageHeader } from "@/components/shared/WorkspaceShell";
import { formatNaira, formatKg } from "@/lib/money";

export function PurchaseForm() {
  const router = useRouter();
  const [quantityKg, setQuantityKg] = useState("100");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
  const [busy, setBusy] = useState(false);
  const summary = useMemo(() => {
    const kg = Math.max(Number(quantityKg) || 0, 0), cost = Math.max(Number(costPrice) || 0, 0), sell = Math.max(Number(sellingPrice) || 0, 0);
    return { totalCost: kg * cost, revenue: kg * sell, profit: kg * (sell - cost), profitPerKg: sell - cost };
  }, [quantityKg, costPrice, sellingPrice]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true);
    try { await apiRequest("/api/gas/stock", { method: "POST", body: JSON.stringify({ quantityKg: Number(quantityKg), costPricePerKg: Number(costPrice), expectedSellingPricePerKg: Number(sellingPrice), purchaseDate: new Date(`${purchaseDate}T12:00:00`).toISOString() }) }); toast.success("Gas purchase recorded."); router.push("/gas/stock"); router.refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save purchase."); }
    finally { setBusy(false); }
  }
  return <>
    <PageHeader eyebrow="GAS / STOCK" title="Add stock purchase" description="Record a new batch. Its cost stays attached to that batch for accurate FIFO costing." action={<Link className="button secondary" href="/gas/stock"><ArrowLeft size={15} /> Back to stock</Link>} />
    <div className="content-grid" style={{ gridTemplateColumns: "minmax(0, 1.35fr) minmax(260px, .8fr)" }}>
      <form className="surface" onSubmit={submit}>
        <div className="form-section"><h2 className="form-section-title">Purchase details</h2><p className="form-section-desc">Enter the amount of gas purchased and the prices paid or expected.</p>
          <div className="field-grid">
            <label className="field"><span className="field-label">Quantity purchased (kg)</span><input className="input" type="number" min="0.0001" step="0.0001" inputMode="decimal" value={quantityKg} onChange={(e) => setQuantityKg(e.target.value)} required /><span className="field-hint">Enter the total kilograms received.</span></label>
            <label className="field"><span className="field-label">Purchase date</span><input className="input" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required /></label>
            <label className="field"><span className="field-label">Cost price per kg (₦)</span><input className="input" type="number" min="0.01" step="0.01" inputMode="decimal" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="e.g. 1000" required /><span className="field-hint">How much this business paid per kg.</span></label>
            <label className="field"><span className="field-label">Expected selling price per kg (₦)</span><input className="input" type="number" min="0.01" step="0.01" inputMode="decimal" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="e.g. 1300" required /><span className="field-hint">Used for this batch's estimate only.</span></label>
          </div>
        </div>
        <div className="form-actions"><Link href="/gas/stock" className="button secondary">Cancel</Link><button type="submit" className="button" disabled={busy}>{busy ? "Saving purchase…" : <><CheckCircle2 size={16} /> Save purchase</>}</button></div>
      </form>
      <div className="list-stack">
        <section className="surface surface-pad"><div className="surface-heading" style={{ border: 0, padding: 0, marginBottom: 17 }}><div><h2 className="surface-title">Purchase summary</h2><p className="surface-subtitle">Calculates as you enter the details</p></div></div>
          <div className="amount-highlight"><div className="amount-highlight-label">Total purchase cost</div><div className="amount-highlight-value text-black">{formatNaira(summary.totalCost)}</div></div>
          <div className="summary-list" style={{ marginTop: 20 }}><div className="summary-row"><span>Quantity received</span><strong>{formatKg(Number(quantityKg) || 0)}</strong></div><div className="summary-row"><span>Expected revenue</span><strong>{formatNaira(summary.revenue)}</strong></div><div className="summary-row"><span>Expected gross profit</span><strong style={{ color: summary.profit >= 0 ? "#166534" : "#b91c1c" }}>{formatNaira(summary.profit)}</strong></div><div className="summary-row"><span>Expected profit per kg</span><strong>{formatNaira(summary.profitPerKg)}</strong></div></div>
        </section>
        <div className="notice neutral" style={{ display: "flex", gap: 9 }}><Info size={17} style={{ flexShrink: 0 }} /><span>The current retail price used for sales is configured separately in Gas Settings. Changing it will not rewrite this purchase estimate or past sales.</span></div>
      </div>
    </div>
  </>;
}
