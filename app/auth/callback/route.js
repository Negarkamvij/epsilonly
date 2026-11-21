import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { appOrigin } from "../../../lib/http";
import { safeNext } from "../../../lib/validation";

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const supabase = await createClient();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext(url.searchParams.get("next")), appOrigin(request)));
  }
  return NextResponse.redirect(new URL("/login?confirmation=failed", appOrigin(request)));
}
