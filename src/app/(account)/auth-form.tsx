"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type Kind = "login" | "register" | "forgot" | "reset" | "verify";

export function AuthForm({ kind }: { kind: Kind }) {
  const router = useRouter();
  const [message, setMessage] = useState(kind === "verify" ? "One moment, while we make your email welcome." : "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let savedTheme = "light";
    try { savedTheme = localStorage.getItem("asrvone-theme") === "dark" ? "dark" : "light"; } catch {}
    document.querySelector(".auth-page")?.classList.toggle("theme-dark", savedTheme === "dark");
    const toggle = document.querySelector(".auth-theme-toggle");
    toggle?.setAttribute("aria-pressed", String(savedTheme === "dark"));
    toggle?.setAttribute("aria-label", `Switch to ${savedTheme === "dark" ? "light" : "dark"} theme`);
  }, []);

  useEffect(() => {
    if (kind !== "verify") return;
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) { setMessage("This link is missing its token. Request a fresh email and try again."); return; }
    fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (response) => { const payload = await response.json(); setMessage(payload.message || payload.error || "Your email could not be verified."); })
      .catch(() => setMessage("The verification link could not be reached just now."));
  }, [kind]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    if (kind === "reset") data.token = new URLSearchParams(window.location.search).get("token") || "";
    setBusy(true);
    setMessage("Sending your note securely…");
    try {
      const endpoint = kind === "login" ? "/api/auth/login" : kind === "register" ? "/api/auth/register" : kind === "forgot" ? "/api/auth/forgot-password" : "/api/auth/reset-password";
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The request could not be completed.");
      if (kind === "login") { router.push("/dashboard"); router.refresh(); return; }
      setMessage(payload.developmentLink ? `${payload.message} Development link: ${payload.developmentLink}` : payload.message || "Your request is complete.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The request could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  function toggleTheme() {
    const page = document.querySelector(".auth-page");
    const nextTheme = page?.classList.contains("theme-dark") ? "light" : "dark";
    try { localStorage.setItem("asrvone-theme", nextTheme); } catch {}
    page?.classList.toggle("theme-dark", nextTheme === "dark");
    const toggle = document.querySelector(".auth-theme-toggle");
    toggle?.setAttribute("aria-pressed", String(nextTheme === "dark"));
    toggle?.setAttribute("aria-label", `Switch to ${nextTheme === "dark" ? "light" : "dark"} theme`);
  }

  const heading = kind === "login" ? <>Come on <em>in.</em></> : kind === "register" ? <>Give your next chapter <em>a name.</em></> : kind === "forgot" ? <>Find your way <em>back.</em></> : kind === "reset" ? <>A fresh start, <em>from here.</em></> : <>Your email has <em>a door.</em></>;
  const descriptor = kind === "login" ? "Your work is here, waiting where you left it." : kind === "register" ? "A place in the learning community begins with a verified address." : kind === "forgot" ? "We’ll send a private link to the address on your account." : kind === "reset" ? "Choose a strong password and return to the work that matters to you." : "Verification keeps your account and learning space in the right hands.";

  return (
    <main className="platform-page auth-page">
      <div className="auth-controls">
        <Link className="auth-brand" href="/" aria-label="ASRVOne home"><strong>ASRV</strong><em>One</em></Link>
        <button className="theme-toggle auth-theme-toggle" type="button" aria-pressed="false" aria-label="Switch to dark theme" onClick={toggleTheme}>
          <svg className="theme-icon theme-icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.2A8.5 8.5 0 0 1 8.8 3.8 8.6 8.6 0 1 0 20.2 15.2Z" /></svg>
          <svg className="theme-icon theme-icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.7" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>
        </button>
      </div>
      <section className="platform-panel narrow">
        <p className="platform-eyebrow">ASRVONE · LEARN, CODE, GROW</p>
        <h1>{heading}</h1>
        <p className="platform-lede">{descriptor}</p>
        <div className="platform-card">
          {kind !== "verify" && <form className="platform-form" onSubmit={submit}>
            {kind === "register" && <label>Your name<input name="displayName" required minLength={2} maxLength={140} autoComplete="name" /></label>}
            {kind !== "reset" && <label>Email address<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>}
            {(kind === "login" || kind === "register" || kind === "reset") && <label>Password<input name="password" type="password" required minLength={kind === "login" ? 1 : 12} maxLength={128} autoComplete={kind === "login" ? "current-password" : "new-password"} />{kind !== "login" && <small>Use at least 12 characters with uppercase, lowercase, and a number.</small>}</label>}
            {kind === "register" && <label>College or institution<input name="college" maxLength={180} autoComplete="organization" /></label>}
            <button className="platform-button" disabled={busy}>{busy ? "Please wait…" : kind === "login" ? "Sign in" : kind === "register" ? "Create my account" : kind === "forgot" ? "Send reset link" : "Set new password"}<span aria-hidden="true"> ↗</span></button>
          </form>}
          <p className="platform-message" role="status" aria-live="polite">{message}</p>
        </div>
        <nav className="platform-links"><Link href="/">Back to the beginning</Link>{kind !== "login" && <Link href="/login">Sign in</Link>}{kind !== "register" && <Link href="/register">Create an account</Link>}{kind !== "forgot" && <Link href="/forgot-password">Forgot password?</Link>}</nav>
      </section>
    </main>
  );
}
