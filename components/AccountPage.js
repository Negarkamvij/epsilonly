import Image from "next/image";
import SiteHeader from "./SiteHeader";
import AuthForm from "./AuthForm";
import { getSupabaseConfig } from "../lib/supabase/config";

const copy = {
  signup: ["YOUR LEARNING, SAVED", "A little practice.", "A place to grow.", "Create an account to save your sessions and see how your practice adds up."],
  login: ["GOOD TO SEE YOU AGAIN", "Your next", "aha moment awaits.", "Sign in to pick up where you left off."],
  forgot: ["LET’S GET YOU BACK IN", "A fresh start", "for your password.", "Enter your account email and we’ll send a reset link."],
  reset: ["ONE LAST STEP", "Make yourself", "a new password.", "Choose a unique passphrase for your CalcQuest account."],
};
export default function AccountPage({ mode, next, confirmationFailed }) {
  const [label, title, accent, description] = copy[mode];
  return <div className="learning-site"><SiteHeader /><main className="account-page page-width"><div className="account-intro"><div className="eyebrow">{label}</div><h1>{title}<br /><em>{accent}</em></h1><p>{description}</p><Image src="/brain.png" alt="Your cheerful calculus sidekick" width={140} height={140} className="account-mascot" /><p className="form-hint">Small steps count. We’ll help you keep track.</p></div><div className="account-card"><h2>{mode === "signup" ? "Create your account" : mode === "login" ? "Welcome back" : "Reset your password"}</h2><AuthForm mode={mode} next={next} confirmationFailed={confirmationFailed} configured={Boolean(getSupabaseConfig())} /></div></main></div>;
}
