"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AccountSettings({ canDeleteAccount }) {
  const [mode, setMode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const fields = new FormData(event.currentTarget);
      const response = await fetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: mode, password: fields.get("password") || "" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (mode === "delete-account") router.replace("/");
      setMode(""); router.refresh();
    } catch (err) { setError(err.message || "Could not finish that request."); }
    finally { setBusy(false); }
  }
  return <details className="account-settings"><summary>Manage my data</summary><p className="form-hint">You control your saved practice. Deleting history permanently removes your sessions and answers.</p><div className="results-actions"><button className="math-tool" type="button" disabled={busy} onClick={() => { setMode("clear-history"); setError(""); }}>Clear practice history</button>{canDeleteAccount && <button className="math-tool" type="button" disabled={busy} onClick={() => { setMode("delete-account"); setError(""); }}>Delete account</button>}</div>{mode && <form onSubmit={submit} className="account-form"><p>{mode === "delete-account" ? "Delete your account and all practice data? This cannot be undone." : "Permanently clear your practice history? This cannot be undone."}</p>{mode === "delete-account" && <label>Confirm with your password<input name="password" type="password" autoComplete="current-password" required maxLength={128} disabled={busy} /></label>}<label className="upload-consent"><input type="checkbox" required disabled={busy} /> <span>I understand this permanently deletes my {mode === "delete-account" ? "account and saved practice" : "practice history"}.</span></label><div className="results-actions"><button className="button danger-button" type="submit" disabled={busy}>{busy ? "Deleting…" : "Confirm deletion"}</button><button type="button" className="math-tool" onClick={() => setMode("")} disabled={busy}>Cancel</button></div>{error && <p className="form-error" role="alert">{error}</p>}</form>}</details>;
}
