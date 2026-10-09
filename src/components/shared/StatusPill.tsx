export function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized === "completed" || normalized === "paid" || normalized === "active" ? "success"
    : normalized === "outstanding" || normalized === "partially_paid" || normalized === "corrected" ? "warning"
    : normalized === "voided" || normalized === "cancelled" || normalized === "finished" ? "danger"
    : "brand";
  return <span className={`status-pill ${tone}`}>{normalized.replaceAll("_", " ")}</span>;
}
