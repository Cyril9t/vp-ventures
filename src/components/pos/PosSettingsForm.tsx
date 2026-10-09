"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Edit3, Plus, Settings2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/WorkspaceShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { apiRequest } from "@/lib/client-api";
import { formatNaira } from "@/lib/money";

const services = [["CASH_WITHDRAWAL", "Cash withdrawal"], ["CARD_WITHDRAWAL", "Card withdrawal"], ["CASH_DEPOSIT", "Cash deposit"], ["TRANSFER", "Transfer"], ["AIRTIME", "Airtime"], ["DATA", "Data"]] as const;
type Rule = { id: string; service: string; minimumAmount: number; maximumAmount: number | null; serviceCharge: number; active: boolean };
type RuleForm = { service: string; minimumAmount: string; maximumAmount: string; serviceCharge: string };
const emptyForm: RuleForm = { service: "CASH_WITHDRAWAL", minimumAmount: "100", maximumAmount: "500", serviceCharge: "50" };
const labelFor = (value: string) => services.find(([key]) => key === value)?.[1] ?? value.replaceAll("_", " ").toLowerCase();

export function PosSettingsForm() {
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<RuleForm>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() { setRules(await apiRequest<Rule[]>("/api/pos/charge-rules")); }
  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : "Unable to load charge rules.")); }, []);
  const grouped = useMemo(() => services.map(([service, label]) => ({ service, label, rules: (rules ?? []).filter((r) => r.service === service) })), [rules]);
  function startNew(service?: string) { setEditing(null); setForm({ ...emptyForm, service: service ?? "CASH_WITHDRAWAL" }); setFormOpen(true); }
  function startEdit(rule: Rule) { setEditing(rule.id); setForm({ service: rule.service, minimumAmount: String(rule.minimumAmount), maximumAmount: rule.maximumAmount === null ? "" : String(rule.maximumAmount), serviceCharge: String(rule.serviceCharge) }); setFormOpen(true); }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true);
    const payload = { service: form.service, minimumAmount: Number(form.minimumAmount), maximumAmount: form.maximumAmount.trim() ? Number(form.maximumAmount) : null, serviceCharge: Number(form.serviceCharge), active: true };
    try {
      if (editing) await apiRequest(`/api/pos/charge-rules/${editing}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await apiRequest("/api/pos/charge-rules", { method: "POST", body: JSON.stringify(payload) });
      toast.success(editing ? "Charge rule updated." : "Charge rule added."); setFormOpen(false); setEditing(null); await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to save charge rule."); }
    finally { setBusy(false); }
  }
  async function deactivate(rule: Rule) {
    if (!window.confirm(`Deactivate the ${labelFor(rule.service).toLowerCase()} rule for ${formatNaira(rule.minimumAmount)}–${rule.maximumAmount === null ? "and above" : formatNaira(rule.maximumAmount)}? Historical transactions will not change.`)) return;
    try { await apiRequest(`/api/pos/charge-rules/${rule.id}`, { method: "DELETE" }); toast.success("Charge rule deactivated."); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Unable to deactivate rule."); }
  }
  if (!rules) return error ? <div className="notice">{error}</div> : <LoadingState label="Loading POS settings…" />;
  return <>
    <PageHeader eyebrow="POS / CONFIGURATION" title="POS settings" description="Manage amount ranges and service charges. Historical transactions retain the charge originally applied." action={<button className="button" onClick={() => startNew()}><Plus size={16} /> Add rule</button>} />
    <div className="notice neutral" style={{ marginBottom: 20 }}>Service-charge ranges must not overlap within the same service. Each service has its own rules. Gas payments always have a ₦0 service charge.</div>
    {formOpen && <form className="surface" onSubmit={submit} style={{ marginBottom: 22 }}><div className="form-section"><div className="surface-heading" style={{ padding: 0, border: 0, marginBottom: 18 }}><div><h2 className="form-section-title" style={{ margin: 0 }}>{editing ? "Edit service-charge rule" : "New service-charge rule"}</h2><p className="surface-subtitle">Use an empty maximum for an open-ended top range.</p></div><button className="icon-button" type="button" aria-label="Close form" onClick={() => setFormOpen(false)}><X size={17} /></button></div><div className="field-grid"><label className="field"><span className="field-label">POS service</span><select className="select" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>{services.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="field"><span className="field-label">Service charge (₦)</span><input className="input" type="number" min="0" step="0.01" value={form.serviceCharge} onChange={(e) => setForm({ ...form, serviceCharge: e.target.value })} required /></label><label className="field"><span className="field-label">Minimum amount (₦)</span><input className="input" type="number" min="0" step="0.01" value={form.minimumAmount} onChange={(e) => setForm({ ...form, minimumAmount: e.target.value })} required /></label><label className="field"><span className="field-label">Maximum amount (₦)</span><input className="input" type="number" min="0" step="0.01" value={form.maximumAmount} onChange={(e) => setForm({ ...form, maximumAmount: e.target.value })} placeholder="No upper limit" /></label></div></div><div className="form-actions"><button className="button secondary" type="button" onClick={() => setFormOpen(false)}>Cancel</button><button className="button" type="submit" disabled={busy}>{busy ? "Saving…" : <><Check size={16} /> Save rule</>}</button></div></form>}
    <div className="list-stack">{grouped.map((group) => <section className="surface" key={group.service}><div className="surface-heading"><div><h2 className="surface-title">{group.label}</h2><p className="surface-subtitle">{group.rules.filter((r) => r.active).length} active rules</p></div><button className="button secondary small" onClick={() => startNew(group.service)}><Plus size={14} /> Add range</button></div><div className="surface-pad">{group.rules.length ? <div className="rule-grid">{group.rules.map((rule) => <div className={`rule-card ${!rule.active ? "rule-inactive" : ""}`} key={rule.id}><div className="rule-top"><div><div className="rule-range">{formatNaira(rule.minimumAmount)} — {rule.maximumAmount === null ? "and above" : formatNaira(rule.maximumAmount)}</div><div className="rule-service">{rule.active ? "Active range" : "Inactive · kept for history"}</div></div><div className="rule-charge">{formatNaira(rule.serviceCharge)}</div></div><div className="action-row"><button className="button secondary small" onClick={() => startEdit(rule)}><Edit3 size={13} /> Edit</button>{rule.active && <button className="button secondary small" onClick={() => deactivate(rule)}><Trash2 size={13} /> Deactivate</button>}</div></div>)}</div> : <div className="field-hint">No rule configured for this service yet. Add a rule to allow transactions.</div>}</div></section>)}</div>
    <section className="surface surface-pad" style={{ marginTop: 20 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="empty-icon" style={{ margin: 0 }}><Settings2 size={19} /></div><div><h2 className="surface-title">Business information</h2><p className="surface-subtitle">The business name, phone, address, and retail gas price are shared across workspaces.</p></div></div><Link href="/gas/settings" className="button secondary" style={{ marginTop: 17 }}>Manage business details</Link></section>
  </>;
}
