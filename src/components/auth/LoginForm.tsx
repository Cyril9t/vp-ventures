"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/client-api";
import { Brand } from "@/components/shared/WorkspaceShell";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

type LoginResponse = { user: { forcePasswordChange: boolean } };

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await apiRequest<LoginResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      toast.success("Welcome back.");
      router.replace(response.user.forcePasswordChange ? "/account?required=1" : "/");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to log in.");
    } finally { setBusy(false); }
  }

  return <div className="auth-page">
    <section className="auth-visual">
      <Brand light />
      <div>
        <div className="eyebrow" style={{ color: "#fb923c" }}>YOUR BUSINESS, IN CONTROL</div>
        <h1 className="auth-hero-title">A clearer view of <span>every move.</span></h1>
        <p className="auth-hero-copy">Manage gas inventory, sales, customer debts and POS activity in one calm, reliable workspace built around the way your business works.</p>
      </div>
      <div className="auth-bottom">© {new Date().getFullYear()} VP Ventures Inventory System</div>
    </section>
    <section className="auth-form-side" style={{ position: "relative" }}>
      <div style={{ position: "absolute", right: 20, top: 20 }}><ThemeToggle compact /></div>
      <div className="auth-form-wrap">
        <div className="brand-lockup" style={{ padding: 0, marginBottom: 37 }}><div className="brand-symbol"><LockKeyhole size={18} /></div><div><div className="brand-name">SECURE OWNER ACCESS</div><div className="brand-caption">Private business workspace</div></div></div>
        <h2 className="auth-form-title">Welcome back.</h2>
        <p className="auth-form-copy">Sign in to manage your business operations.</p>
        <form onSubmit={submit} className="list-stack">
          <label className="field"><span className="field-label">Email address</span><input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@vpventures.com" required /></label>
          <label className="field"><span className="field-label">Password</span><span style={{ position: "relative" }}><input className="input" style={{ paddingRight: 46 }} type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required /><button type="button" className="icon-button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 5, top: 4, width: 38, height: 38, border: 0 }} >{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
          <button className="button full" type="submit" disabled={busy} style={{ marginTop: 7, minHeight: 49 }}>{busy ? "Signing in…" : <>Sign in securely <ArrowRight size={16} /></>}</button>
        </form>
        <div className="notice neutral" style={{ marginTop: 22 }}>This workspace is for the business owner only. Public registration is disabled.</div>
      </div>
    </section>
  </div>;
}
