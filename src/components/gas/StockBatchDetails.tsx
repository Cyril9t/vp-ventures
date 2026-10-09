"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, ClipboardList, Pencil, Scale, SlidersHorizontal, Weight } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/WorkspaceShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusPill } from "@/components/shared/StatusPill";
import { apiRequest } from "@/lib/client-api";
import { formatNaira, formatKg } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/dates";

type Batch = { id: string; batchNumber: string; purchaseDate: string; quantityPurchased: number; remainingQuantity: number; soldQuantity: number; costPricePerKg: number; expectedSellingPricePerKg: number; totalPurchaseCost: number; expectedRevenue: number; expectedGrossProfit: number; status: string; allocations: Array<{ id: string; quantityKg: number; costPricePerKg: number; costAmount: number; sale: { id: string; saleNumber: string; amount: number; createdAt: string; status: string } }>; movements: Array<{ id: string; type: string; quantityDelta: number; unitCost: number | null; reason: string | null; reference: string | null; createdAt: string }> };
type StockItem = { id: string; remainingQuantity: number };

export function StockBatchDetails({ id }: { id: string }) {
  const router = useRouter();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [error, setError] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [purchaseQuantity, setPurchaseQuantity] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [sellingEstimate, setSellingEstimate] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [physical, setPhysical] = useState("");
  const [reason, setReason] = useState("Physical stock count");
  const [busy, setBusy] = useState(false);
  const [systemTotal, setSystemTotal] = useState<number | null>(null);
  useEffect(() => {
    Promise.all([apiRequest<Batch>(`/api/gas/stock/${id}`), apiRequest<StockItem[]>("/api/gas/stock")])
      .then(([record, batches]) => { setBatch(record); const total = batches.reduce((sum, item) => sum + item.remainingQuantity, 0); setSystemTotal(total); setPhysical(String(total)); setPurchaseQuantity(String(record.quantityPurchased)); setPurchaseCost(String(record.costPricePerKg)); setSellingEstimate(String(record.expectedSellingPricePerKg)); setPurchaseDate(new Date(record.purchaseDate).toISOString().slice(0, 10)); })
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load stock batch."));
  }, [id]);
  function openPurchaseEditor() {
    if (!batch) return;
    setPurchaseQuantity(String(batch.quantityPurchased));
    setPurchaseCost(String(batch.costPricePerKg));
    setSellingEstimate(String(batch.expectedSellingPricePerKg));
    setPurchaseDate(new Date(batch.purchaseDate).toISOString().slice(0, 10));
    setEditOpen(true);
  }
  async function savePurchase(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true);
    try {
      await apiRequest(`/api/gas/stock/${id}`, { method: "PATCH", body: JSON.stringify({ quantityKg: Number(purchaseQuantity), costPricePerKg: Number(purchaseCost), expectedSellingPricePerKg: Number(sellingEstimate), purchaseDate }) });
      toast.success("Purchase details updated."); setEditOpen(false); router.refresh();
      const [record, batches] = await Promise.all([apiRequest<Batch>(`/api/gas/stock/${id}`), apiRequest<StockItem[]>("/api/gas/stock")]);
      setBatch(record); const total = batches.reduce((sum, item) => sum + item.remainingQuantity, 0); setSystemTotal(total); setPhysical(String(total));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to update purchase details."); }
    finally { setBusy(false); }
  }
  async function adjust(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true);
    try { const result = await apiRequest<{ difference: number }>(`/api/gas/stock/${id}/adjust`, { method: "POST", body: JSON.stringify({ physicalQuantityKg: Number(physical), reason }) }); toast.success(`Stock adjustment recorded (${result.difference > 0 ? "+" : ""}${result.difference} kg).`); setAdjustOpen(false); router.refresh(); const [record, batches] = await Promise.all([apiRequest<Batch>(`/api/gas/stock/${id}`), apiRequest<StockItem[]>("/api/gas/stock")]); setBatch(record); const total = batches.reduce((sum, item) => sum + item.remainingQuantity, 0); setSystemTotal(total); setPhysical(String(total)); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Unable to adjust stock."); }
    finally { setBusy(false); }
  }
  if (!batch) return error ? <div className="notice">{error}</div> : <LoadingState label="Loading batch details…" />;
  return <>
    <PageHeader eyebrow="GAS / STOCK DETAILS" title={batch.batchNumber} description={`Purchase recorded on ${formatDate(batch.purchaseDate)}.`} action={<Link className="button secondary" href="/gas/stock"><ArrowLeft size={15} /> Back to stock</Link>} />
    <div className="stats-grid"><div className="stat-card"><div className="stat-head">Remaining <span className="stat-icon"><Weight size={16} /></span></div><div className="stat-value">{formatKg(batch.remainingQuantity)}</div><div className="stat-note">Available in this batch</div></div><div className="stat-card"><div className="stat-head">Sold / used <span className="stat-icon"><Scale size={16} /></span></div><div className="stat-value">{formatKg(batch.soldQuantity)}</div><div className="stat-note">Allocated to gas sales</div></div><div className="stat-card"><div className="stat-head">Purchase cost <span className="stat-icon"><ClipboardList size={16} /></span></div><div className="stat-value">{formatNaira(batch.totalPurchaseCost)}</div><div className="stat-note">Original batch cost</div></div><div className="stat-card"><div className="stat-head">Batch status <span className="stat-icon"><CalendarDays size={16} /></span></div><div style={{ marginTop: 16 }}><StatusPill status={batch.status} /></div><div className="stat-note">Based on remaining quantity</div></div></div>
    <div className="content-grid">
      <div className="list-stack">
        <section className="surface"><div className="surface-heading"><div><h2 className="surface-title">Batch information</h2><p className="surface-subtitle">Purchase and profitability details</p></div><div className="action-row"><button className="button secondary small" onClick={openPurchaseEditor} disabled={batch.allocations.length > 0 || batch.movements.some((movement) => movement.type !== "PURCHASE")} title={batch.allocations.length > 0 || batch.movements.some((movement) => movement.type !== "PURCHASE") ? "Purchase details cannot be edited after stock is sold or adjusted." : "Edit purchase details"}><Pencil size={14} /> Edit purchase</button><button className="button secondary small" onClick={() => setAdjustOpen(true)}><SlidersHorizontal size={14} /> Adjust stock</button></div></div><div className="surface-pad"><div className="details-grid">{[["Purchase date", formatDate(batch.purchaseDate)], ["Quantity purchased", formatKg(batch.quantityPurchased)], ["Cost price per kg", formatNaira(batch.costPricePerKg)], ["Selling estimate per kg", formatNaira(batch.expectedSellingPricePerKg)], ["Expected revenue", formatNaira(batch.expectedRevenue)], ["Expected gross profit", formatNaira(batch.expectedGrossProfit)]].map(([label, value]) => <div className="detail-item" key={label}><div className="detail-label">{label}</div><div className="detail-value">{value}</div></div>)}</div><div style={{ marginTop: 21 }}><div className="record-bottom" style={{ padding: 0, border: 0, marginBottom: 8 }}><span className="record-foot">Stock consumption</span><strong className="record-foot">{batch.quantityPurchased ? Math.min(100, Math.max(0, batch.soldQuantity / batch.quantityPurchased * 100)).toFixed(1) : "0.0"}% used</strong></div><div style={{ height: 9, borderRadius: 99, background: "#f4f4f5", overflow: "hidden" }}><div style={{ width: `${batch.quantityPurchased ? Math.min(100, Math.max(0, batch.soldQuantity / batch.quantityPurchased * 100)) : 0}%`, height: "100%", background: "var(--workspace-accent)", borderRadius: 99, transition: "width .3s ease" }} /></div></div></div></section>
        <section className="surface"><div className="surface-heading"><div><h2 className="surface-title">Related sales</h2><p className="surface-subtitle">Sales that consumed this batch, including partial allocations</p></div></div><div className="surface-pad">{batch.allocations.length ? <div className="list-stack">{batch.allocations.map((a) => <Link key={a.id} href={`/gas/sales/${a.sale.id}`} className="record-card"><div className="record-top"><div><div className="record-title">{a.sale.saleNumber}</div><div className="record-meta">{formatDateTime(a.sale.createdAt)}</div></div><div className="record-amount">{formatNaira(a.sale.amount)}</div></div><div className="record-bottom"><span className="record-foot">{formatKg(a.quantityKg)} consumed · Cost {formatNaira(a.costAmount)}</span><StatusPill status={a.sale.status} /></div></Link>)}</div> : <div className="field-hint">No sales have consumed this batch yet.</div>}</div></section>
      </div>
      <section className="surface"><div className="surface-heading"><div><h2 className="surface-title">Stock movement history</h2><p className="surface-subtitle">Every stock change is recorded</p></div></div><div className="surface-pad">{batch.movements.length ? <div className="list-stack">{batch.movements.map((movement) => <div className="record-card" key={movement.id}><div className="record-top"><div><div className="record-title">{movement.type.replaceAll("_", " ").toLowerCase()}</div><div className="record-meta">{formatDateTime(movement.createdAt)}</div></div><div className="record-amount" style={{ color: movement.quantityDelta < 0 ? "#b91c1c" : "#166534" }}>{movement.quantityDelta > 0 ? "+" : ""}{formatKg(movement.quantityDelta)}</div></div><div className="record-bottom"><span className="record-foot">{movement.reason || movement.reference || "Stock movement"}</span></div></div>)}</div> : <div className="field-hint">No stock movement history yet.</div>}</div></section>
    </div>
    {editOpen && <div className="dialog-backdrop" role="presentation" onClick={() => !busy && setEditOpen(false)}><section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="edit-purchase-title" onClick={(e) => e.stopPropagation()}><h2 id="edit-purchase-title" className="surface-title">Edit purchase details</h2><p className="surface-subtitle" style={{ marginBottom: 18 }}>Purchase details can only be changed before stock from this batch is sold or adjusted. Historical batch costs are protected.</p><form className="list-stack" onSubmit={savePurchase}><label className="field"><span className="field-label">Purchase date</span><input className="input" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required /></label><label className="field"><span className="field-label">Quantity purchased (kg)</span><input className="input" type="number" min="0.0001" step="0.0001" value={purchaseQuantity} onChange={(e) => setPurchaseQuantity(e.target.value)} required /></label><label className="field"><span className="field-label">Cost price per kg (₦)</span><input className="input" type="number" min="0.01" step="0.01" value={purchaseCost} onChange={(e) => setPurchaseCost(e.target.value)} required /></label><label className="field"><span className="field-label">Expected selling price per kg (₦)</span><input className="input" type="number" min="0.01" step="0.01" value={sellingEstimate} onChange={(e) => setSellingEstimate(e.target.value)} required /></label><div className="notice neutral">Expected purchase cost: <strong>{formatNaira((Number(purchaseQuantity) || 0) * (Number(purchaseCost) || 0))}</strong></div><div className="dialog-actions"><button type="button" className="button secondary" onClick={() => setEditOpen(false)} disabled={busy}>Cancel</button><button type="submit" className="button" disabled={busy}>{busy ? "Saving…" : "Save purchase"}</button></div></form></section></div>}
    {adjustOpen && <div className="dialog-backdrop" role="presentation" onClick={() => setAdjustOpen(false)}><section className="dialog-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}><h2 className="surface-title">Adjust physical stock</h2><p className="surface-subtitle" style={{ marginBottom: 18 }}>This adjustment compares the physical quantity across the whole gas stock with the system total.</p><div className="amount-highlight" style={{ marginBottom: 18 }}><div className="amount-highlight-label">Current system stock</div><div className="amount-highlight-value">{formatKg(systemTotal ?? 0)}</div></div><form className="list-stack" onSubmit={adjust}><label className="field"><span className="field-label">Physical total stock (kg)</span><input className="input" type="number" step="0.0001" min="0" required value={physical} onChange={(e) => setPhysical(e.target.value)} /></label><label className="field"><span className="field-label">Reason for adjustment</span><textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} minLength={3} maxLength={240} required /></label><div className="dialog-actions"><button type="button" className="button secondary" onClick={() => setAdjustOpen(false)}>Cancel</button><button type="submit" className="button" disabled={busy}>{busy ? "Saving…" : "Confirm adjustment"}</button></div></form></section></div>}
  </>;
}
