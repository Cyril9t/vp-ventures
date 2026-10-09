import Link from "next/link";

export default function NotFound() {
  return <main className="login-shell"><section className="login-card" style={{ textAlign: "center" }}><div className="brand-symbol" style={{ margin: "0 auto 20px" }}>VP</div><div className="eyebrow">404 / PAGE NOT FOUND</div><h1 className="login-title">We couldn’t find that page.</h1><p className="login-copy">The link may be incorrect, or the page may have moved.</p><Link className="button" href="/">Return to system home</Link></section></main>;
}
