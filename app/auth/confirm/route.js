import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { appOrigin } from "../../../lib/http";
import { safeNext } from "../../../lib/validation";

export async function GET(request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const supabase = await createClient();
  if (supabase && token_hash && ["email", "signup", "recovery"].includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) return NextResponse.redirect(new URL(type === "recovery" ? "/reset-password" : safeNext(url.searchParams.get("next")), appOrigin(request)));
  }
  return NextResponse.redirect(new URL("/login?confirmation=failed", appOrigin(request)));
}
