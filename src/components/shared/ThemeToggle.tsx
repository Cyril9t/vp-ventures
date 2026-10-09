"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = window.localStorage.getItem("vp-ventures-theme");
    const preferDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = preferDark ? "dark" : "light";
    setDark(preferDark);
  }, []);
  function toggle() {
    const next = !dark;
    document.documentElement.dataset.theme = next ? "dark" : "light";
    window.localStorage.setItem("vp-ventures-theme", next ? "dark" : "light");
    setDark(next);
  }
  return <button type="button" className={`theme-toggle ${compact ? "compact" : ""}`} onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>;
}
