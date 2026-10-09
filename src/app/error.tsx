"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="login-shell"><section className="login-card" style={{ textAlign: "center" }}><div className="eyebrow">SOMETHING WENT WRONG</div><h1 className="login-title">That didn’t work as expected.</h1><p className="login-copy">No business records were intentionally removed. Try again, and check your database connection if the problem continues.</p><button className="button" onClick={() => reset()}>Try again</button></section></main>;
}
