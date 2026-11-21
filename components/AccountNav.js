"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

export default function AccountNav() {
  const [signedIn, setSignedIn] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setSignedIn(false); return; }
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => { if (mounted) setSignedIn(Boolean(data.user)); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session?.user)));
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, []);
  async function logout() {
    setBusy(true); setError("");
    const supabase = createClient();
    const { error: signoutError } = await supabase.auth.signOut();
    if (signoutError) { setError("Could not sign out. Try again."); setBusy(false); return; }
    setSignedIn(false); setBusy(false); router.replace("/"); router.refresh();
  }
  return <div className="account-nav">
    {signedIn ? <><Link href="/dashboard" className="account-link">My progress</Link><button type="button" className="account-link signout-link" disabled={busy} onClick={logout}>{busy ? "Signing out…" : "Sign out"}</button></> : <><Link href="/login" className="account-link">Sign in</Link><Link href="/signup" className="account-signup">Sign up</Link></>}
    {error && <span role="alert">{error}</span>}
  </div>;
}
