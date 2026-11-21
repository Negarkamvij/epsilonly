import { createClient } from "@supabase/supabase-js";
import { getIdentity } from "../../../lib/supabase/server";
import { createAdminClient } from "../../../lib/supabase/admin";
import { getSupabaseConfig } from "../../../lib/supabase/config";
import { json, readJson, sameOrigin } from "../../../lib/http";

export async function DELETE(request) {
  if (!sameOrigin(request)) return json({ error: "Request origin is not allowed." },403);
  const { supabase, user } = await getIdentity();
  if (!user) return json({ error: "Please sign in again." },401);
  let body;
  try { body = await readJson(request,2000); }
  catch { return json({ error: "Invalid request." },400); }
  if (body.action === "clear-history") {
    const { error } = await supabase.rpc("clear_practice_history");
    return error ? json({ error: "Could not clear history. Please retry." },503) : json({ deleted:true });
  }
  if (body.action !== "delete-account" || typeof body.password !== "string" || !body.password || body.password.length>128) return json({ error: "Confirm the request with your password." },400);
  const admin = createAdminClient();
  if (!admin) return json({ error: "Account deletion is not configured. Contact the app owner." },503);
  const config = getSupabaseConfig();
  const verifier = createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});
  const { data, error } = await verifier.auth.signInWithPassword({ email:user.email,password:body.password });
  if (error || data.user?.id !== user.id) return json({ error: "Could not confirm your password." },403);
  await verifier.auth.signOut();
  const deleted = await admin.auth.admin.deleteUser(user.id);
  if (deleted.error) return json({ error: "Account deletion failed. Please retry." },503);
  await supabase.auth.signOut({scope:"local"});
  return json({deleted:true});
}
