export function LoadingState({ label = "Loading your records…" }: { label?: string }) {
  return <div className="surface surface-pad" role="status" aria-live="polite"><div className="skeleton" style={{ width: 150, height: 12 }} /><div className="skeleton" style={{ width: "74%", height: 24, marginTop: 18 }} /><div className="skeleton" style={{ width: "48%", height: 12, marginTop: 12 }} /><p className="field-hint" style={{ marginTop: 20 }}>{label}</p></div>;
}
