import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { getIdentity } from "../../../lib/supabase/server";
import { createAdminClient } from "../../../lib/supabase/admin";
import { uploadTypeMatches } from "../../../lib/validation";
import { json, sameOrigin, readMultipart } from "../../../lib/http";
import { generateStoredSession } from "../../../lib/generation-service";
import { providerFailure } from "../../../lib/provider-errors";
import { practicePrompt } from "../../../lib/prompts/practice";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: "Request origin is not allowed." }, 403);
  const { user } = await getIdentity();
  if (!user) return json({ error: "Please sign in before creating a practice session." }, 401);
  if (process.env.ENABLE_AI_GENERATION !== "true") return json({ error: "AI generation is paused while a free-tier provider is configured. You can still use the math playground." }, 503);
  const admin = createAdminClient();
  if (!admin || !process.env.GEMINI_API_KEY) return json({ error: "Practice generation is not configured yet." }, 503);
  let form;
  try { form = await readMultipart(request); }
  catch { return json({ error: "Choose a PDF, JPG, or PNG under 20 MiB." }, 413); }
  const file = form.get("exam_file");
  const course = String(form.get("topic") || "Calculus").trim();
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0 || file.size > 20 * 1024 * 1024 || !course || course.length > 100 || form.get("authorized") !== "true") {
    return json({ error: "Choose an authorized file under 20 MiB and a subject under 100 characters." }, 400);
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!uploadTypeMatches(buffer, file.type)) return json({ error: "The file must be a valid PDF, JPG, or PNG." }, 400);
  const quota = await admin.rpc("reserve_generation_request", { p_user_id: user.id });
  if (quota.error) return json({ error: "Practice storage is not ready yet. Please try again later." }, 503);
  if (!quota.data) return json({ error: "You can generate five sessions per 15 minutes. Please try again later." }, 429);
  try {
    const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: 8192, responseMimeType: "application/json",
        responseSchema: { type: SchemaType.OBJECT, properties: {
          questions: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT,
            properties: { question: { type: SchemaType.STRING }, solution: { type: SchemaType.STRING },
              topic: { type: SchemaType.STRING }, difficulty: { type: SchemaType.STRING, enum: ["Easy", "Medium", "Hard"] } },
            required: ["question", "solution", "topic", "difficulty"],
          } },
        }, required: ["questions"] },
      },
    });
    const stored = await generateStoredSession({
      userId: user.id, course,
      generate: async () => {
        const result = await model.generateContent([
          { inlineData: { data: buffer.toString("base64"), mimeType: file.type } }, practicePrompt(course),
        ], { timeout: 60000 });
        return result.response.text();
      },
      store: async ({ userId, course, questions }) => {
        const { data,error } = await admin.rpc("create_practice_session", {
          p_user_id:userId,p_course:course,p_questions:questions,
        });
        if (error) throw Object.assign(new Error("Practice storage unavailable"),{kind:"storage"});
        return data;
      },
    });
    return json(stored);
  } catch (error) {
    if (error?.kind === "invalid_generation") return json({error:"The AI returned incomplete question data. Please try again."},502);
    if (error?.kind === "storage") return json({error:"The generated session could not be saved. Please try again."},503);
    const failure = providerFailure(error);
    return json({ error: failure.message }, failure.status);
  }
}
