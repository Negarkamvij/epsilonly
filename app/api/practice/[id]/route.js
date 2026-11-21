import { getIdentity } from "../../../../lib/supabase/server";
import { answersSchema, sessionIdSchema } from "../../../../lib/validation";
import { json, sameOrigin, readJson } from "../../../../lib/http";

export const runtime = "nodejs";
async function update(request, context, finish) {
  if (!sameOrigin(request)) return json({ error: "Request origin is not allowed." }, 403);
  const { id } = await context.params;
  if (!sessionIdSchema.safeParse(id).success) return json({ error: "Invalid session." }, 400);
  const { supabase, user } = await getIdentity();
  if (!user) return json({ error: "Please sign in to save your progress." }, 401);
  let parsed;
  try { parsed = answersSchema.safeParse((await readJson(request)).answers); }
  catch { return json({ error: "Invalid answer data." }, 400); }
  if (!parsed.success) return json({ error: "Invalid answer data." }, 400);
  const { data, error } = await supabase.rpc(finish ? "submit_practice_session" : "save_practice_answers", {
    p_session_id: id, p_answers: parsed.data,
  });
  if (error) {
    if (error.code === "P0002") return json({ error: "Session not found." }, 404);
    if (error.code === "55000") return json({ error: "This session was already submitted." }, 409);
    if (["22023", "22P02", "23514"].includes(error.code)) return json({ error: "Invalid answer data." }, 400);
    return json({ error: "Your progress could not be saved. Please retry." }, 503);
  }
  return json(finish ? { review: data } : { saved: true });
}
export const PATCH = (request, context) => update(request, context, false);
export const POST = (request, context) => update(request, context, true);
