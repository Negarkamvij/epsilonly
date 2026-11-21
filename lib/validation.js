import { z } from "zod";

export const answersSchema = z.record(z.uuid(), z.string().max(4000)).refine((value) => Object.keys(value).length <= 30);
export const questionSchema = z.object({
  question: z.string().trim().min(1).max(8000),
  solution: z.string().trim().min(1).max(4000),
  topic: z.string().trim().min(1).max(100),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
});
export const generationSchema = z.object({ questions: z.array(questionSchema).min(1).max(30) });
export const sessionIdSchema = z.uuid();

export function safeNext(value) {
  if (typeof value !== "string" || !/^\/(dashboard|exam|reset-password)(\?|$)/.test(value)) return "/dashboard";
  return value;
}

export function normalizeAnswer(value) {
  return value.trim().replace(/^\$+|\$+$/g, "").replace(/\s+/g, "");
}

export function uploadTypeMatches(buffer, type) {
  if (type === "application/pdf") return buffer.subarray(0, 5).toString() === "%PDF-";
  if (type === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (type === "image/jpeg") return buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  return false;
}
