"use client";
import { useState } from "react";
import { toast } from "sonner";

export function ConfirmReasonDialog({ title, description, confirmLabel, danger = false, onConfirm }: { title: string; description: string; confirmLabel: string; danger?: boolean; onConfirm: (reason: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (reason.trim().length < 3) { toast.error("Please enter a reason of at least 3 characters."); return; }
    setBusy(true);
    try { await onConfirm(reason.trim()); setOpen(false); setReason(""); }
    catch { /* The caller reports request errors; keep the dialog open so the reason can be reviewed. */ }
    finally { setBusy(false); }
  }
  return <>
    <button className={`button ${danger ? "danger" : "secondary"}`} onClick={() => setOpen(true)}>{confirmLabel}</button>
    {open && <div className="dialog-backdrop" role="presentation" onClick={() => !busy && setOpen(false)}><section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onClick={(e) => e.stopPropagation()}>
      <div className="dialog-top"><div><h2 id="dialog-title" className="surface-title">{title}</h2><p className="surface-subtitle">{description}</p></div><button className="icon-button" onClick={() => setOpen(false)} aria-label="Close dialog">×</button></div>
      <label className="field"><span className="field-label">Reason</span><textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this transaction needs attention…" maxLength={240} /></label>
      <div className="dialog-actions"><button className="button secondary" onClick={() => setOpen(false)} disabled={busy}>Cancel</button><button className={`button ${danger ? "danger" : ""}`} onClick={submit} disabled={busy}>{busy ? "Saving…" : confirmLabel}</button></div>
    </section></div>}
  </>;
}
