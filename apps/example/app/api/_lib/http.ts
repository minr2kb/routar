import { NextResponse } from "next/server";
import { z } from "zod";

export const ok = (data: unknown) => NextResponse.json(data);
export const created = (data: unknown) =>
  NextResponse.json(data, { status: 201 });
export const noContent = () => new NextResponse(null, { status: 204 });
export const notFound = (msg = "Not found") =>
  NextResponse.json({ error: msg }, { status: 404 });
export const badRequest = (err: z.ZodError) =>
  NextResponse.json({ error: err.flatten() }, { status: 400 });

/**
 * Maps a thrown validation error to a 400 response. `createParser`'s
 * `parseRequest` throws the original `ZodError` on invalid input — turning that
 * into an HTTP status is the app's job (routar stays framework-agnostic).
 * Anything that isn't a `ZodError` is a real bug, so it re-throws.
 */
export function badRequestFrom(err: unknown): NextResponse {
  if (err instanceof z.ZodError) return badRequest(err);
  throw err;
}
