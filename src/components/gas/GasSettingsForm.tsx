"use client";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Settings2, Tag } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/client-api";
import { PageHeader } from "@/components/shared/WorkspaceShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { formatNaira } from "@/lib/money";

type Settings = { businessName: string; phone: string | null; address: string | null; gasPricePerKg: number };
export function GasSettingsForm() {
  const [settings, setSettings] = useState<Settings>({ businessName: "VP Ventures", phone: "", address: "", gasPricePerKg: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  useEffect(() => { apiRequest<Settings>("/api/gas/settings").then(setSettings).catch((e) => toast.error(e instanceof Error ? e.message : "Unable to load settings.")).finally(() => setLoading(false)); }, []);
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setBusy(true); try { const result = await apiRequest<Settings>("/api/gas/settings", { method: "PATCH", body: JSON.stringify(settings) }); setSettings(result); toast.success("Gas settings saved."); } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to save settings."); } finally { setBusy(false); } }
  if (loading) return <LoadingState label="Loading business settings…" />;
  return <>
    <PageHeader eyebrow="GAS / CONFIGURATION" title="Gas settings" description="Manage your current retail price and business contact details." />
    <form className="surface" onSubmit={submit} style={{ maxWidth: 850 }}>
      <div className="form-section"><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}><div className="empty-icon" style={{ margin: 0 }}><Settings2 size={20} /></div><div><h2 className="form-section-title" style={{ margin: 0 }}>Business information</h2><p className="surface-subtitle">Used for the identity shown inside the system.</p></div></div><div className="field-grid"><label className="field"><span className="field-label">Business name</span><input className="input" value={settings.businessName} onChange={(e) => setSettings({ ...settings, businessName: e.target.value })} minLength={2} required /></label><label className="field"><span className="field-label">Business phone</span><input className="input" type="tel" value={settings.phone ?? ""} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} placeholder="Phone number" /></label><label className="field full-span"><span className="field-label">Business address</span><textarea className="textarea" value={settings.address ?? ""} onChange={(e) => setSettings({ ...settings, address: e.target.value })} placeholder="Business address" /></label></div></div>
      <div className="form-section"><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}><div className="empty-icon" style={{ margin: 0 }}><Tag size={20} /></div><div><h2 className="form-section-title" style={{ margin: 0 }}>Current gas retail price</h2><p className="surface-subtitle">New gas sales use this price to calculate kilograms sold.</p></div></div><label className="field" style={{ maxWidth: 340 }}><span className="field-label">Selling price per kg (₦)</span><input className="input" type="number" min="0.01" step="0.01" inputMode="decimal" value={settings.gasPricePerKg || ""} onChange={(e) => setSettings({ ...settings, gasPricePerKg: Number(e.target.value) })} required /><span className="field-hint">Current value: {formatNaira(settings.gasPricePerKg)} per kilogram.</span></label><div className="notice neutral" style={{ marginTop: 16 }}>Changing the current price will affect future sales only. Each existing sale keeps its recorded price snapshot.</div></div>
      <div className="form-actions"><button className="button" type="submit" disabled={busy || settings.gasPricePerKg <= 0}>{busy ? "Saving settings…" : <><CheckCircle2 size={16} /> Save settings</>}</button></div>
    </form>
  </>;
}
