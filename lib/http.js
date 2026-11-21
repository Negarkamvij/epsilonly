import { NextResponse } from "next/server";

export function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}
export function appOrigin(request) {
  const url = new URL(request.url);
  return new URL(process.env.APP_ORIGIN || `${url.protocol}//${request.headers.get("host") || url.host}`).origin;
}
export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  // All browser mutations must originate from this app. CLI tests send Origin too.
  if (!origin) return false;
  try {
    // Next.js can use an internal hostname in request.url when self-hosted.
    // Never trust X-Forwarded-Host. Pin APP_ORIGIN behind a production proxy.
    return new URL(origin).origin === appOrigin(request);
  } catch { return false; }
}
export async function readJson(request, limit = 150000) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Empty body");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new Error("Body too large"); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}

export async function readMultipart(request, limit = 21 * 1024 * 1024) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Empty upload");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new Error("Upload too large"); }
    chunks.push(value);
  }
  return new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
}
