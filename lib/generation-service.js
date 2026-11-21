import { generationSchema, sessionIdSchema } from "./validation.js";

// Inject the provider and storage boundary so paid calls are never needed in tests.
export async function generateStoredSession({ userId, course, generate, store }) {
  const raw = await generate();
  let payload;
  try { payload = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g,"")); }
  catch { throw Object.assign(new Error("The AI returned invalid question data."),{kind:"invalid_generation"}); }
  const parsed = generationSchema.safeParse(payload);
  if (!parsed.success) throw Object.assign(new Error("The AI response was incomplete."),{kind:"invalid_generation"});
  const id = await store({ userId, course, questions:parsed.data.questions });
  if (!sessionIdSchema.safeParse(id).success) throw Object.assign(new Error("The session could not be saved."),{kind:"storage"});
  return { session_id:id };
}
