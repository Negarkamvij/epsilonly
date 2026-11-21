"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

export default function AuthForm({ mode, next = "/dashboard", configured, confirmationFailed = false }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const signup = mode === "signup";
  const recovery = mode === "forgot";
  const reset = mode === "reset";

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Account setup is not connected yet.");
      const fields = new FormData(event.currentTarget);
      const email = String(fields.get("email") || "").trim();
      const password = String(fields.get("password") || "");
      if ((signup || reset) && password !== fields.get("confirm")) throw new Error("Your passwords don’t match yet.");
      let result;
      if (recovery) {
        result = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
      } else if (reset) result = await supabase.auth.updateUser({ password });
      else if (signup) result = await supabase.auth.signUp({ email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      else result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) {
        if (recovery) throw new Error("Could not request a reset. Please try again shortly.");
        if (!signup && !reset) throw new Error("We couldn’t sign you in. Check your email and password, or confirm your email first.");
        throw new Error("We couldn’t finish that request. Check your details or try again shortly.");
      }
      if (recovery) setMessage("If an account exists for that email, a password reset link will arrive shortly.");
      else if (signup && !result.data.session) setMessage("Check your email for a confirmation link. Once confirmed, you can sign in and start saving your progress.");
      else { router.replace(reset ? "/dashboard" : next); router.refresh(); }
    } catch (err) { setError(err.message || "Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  return <form className="account-form" onSubmit={submit}>
    {confirmationFailed && <p className="form-error" role="alert">That confirmation link could not be verified. Try signing in, or request a new reset link if you were changing your password.</p>}
    {!configured && <p className="setup-note" role="status">Accounts are being connected to Supabase. Sign-up will be available once the project settings are added.</p>}
    {!reset && <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" disabled={busy || !configured} /></label>}
    {!recovery && <>
      <label>{reset ? "New password" : "Password"}<input name="password" type="password" autoComplete={signup || reset ? "new-password" : "current-password"} required minLength={signup || reset ? 12 : 1} maxLength={128} disabled={busy || !configured} /></label>
      {(signup || reset) && <><p className="form-hint">Use at least 12 characters. A longer, unique passphrase works well.</p><label>Confirm password<input name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={128} disabled={busy || !configured} /></label></>}
    </>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {message && <p role="status" className="form-success">{message}</p>}
    <button type="submit" className="button" disabled={busy || !configured}>{busy ? "One moment…" : recovery ? "Send reset link" : reset ? "Save new password" : signup ? "Create my account ↗" : "Welcome back ↗"}</button>
    {!signup && !recovery && !reset && <Link href="/forgot-password">Forgot your password?</Link>}
    {!reset && <p className="form-switch">{signup ? "Already have an account? " : recovery ? "Remembered it? " : "New to CalcQuest? "}<Link href={signup || recovery ? `/login?next=${encodeURIComponent(next)}` : `/signup?next=${encodeURIComponent(next)}`}>{signup || recovery ? "Sign in" : "Create an account"}</Link></p>}
    {signup && <p className="form-hint">We store your email and practice activity to keep your learning history. No school or real name required.</p>}
  </form>;
}
