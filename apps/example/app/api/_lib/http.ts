import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const ok = (data: unknown) => NextResponse.json(data);
export const created = (data: unknown) => NextResponse.json(data, { status: 201 });
export const noContent = () => new NextResponse(null, { status: 204 });
export const notFound = (msg = 'Not found') =>
  NextResponse.json({ error: msg }, { status: 404 });
export const badRequest = (err: z.ZodError) =>
  NextResponse.json({ error: err.flatten() }, { status: 400 });

type ParseOk<T> = { ok: true; data: T };
type ParseFail = { ok: false; res: NextResponse };

export async function parseBody<S extends z.ZodTypeAny>(
  req: NextRequest,
  schema: S,
): Promise<ParseOk<z.infer<S>> | ParseFail> {
  const body = await req.json();
  const result = schema.safeParse(body);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, res: badRequest(result.error) };
}

export function parseQuery<S extends z.ZodTypeAny>(
  sp: URLSearchParams,
  schema: S,
): ParseOk<z.infer<S>> | ParseFail {
  const result = schema.safeParse(Object.fromEntries(sp.entries()));
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, res: badRequest(result.error) };
}
