import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "REQUEST_FAILED",
  ) {
    super(message);
  }
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Please check the highlighted fields.", code: "VALIDATION_ERROR", fields: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) },
      { status: 400 },
    );
  }
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  const errorId = randomUUID();
  console.error(`[request:${errorId}]`, error);
  return NextResponse.json({ error: "ASRVOne could not complete that request.", code: "INTERNAL_ERROR", requestId: errorId }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Send a valid JSON request.", "INVALID_JSON");
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) throw new HttpError(403, "This request could not be verified.", "ORIGIN_REQUIRED");
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new HttpError(403, "This request could not be verified.", "ORIGIN_INVALID");
  }
  const requestUrl = new URL(request.url);
  if (parsed.origin !== requestUrl.origin) {
    throw new HttpError(403, "This request could not be verified.", "ORIGIN_MISMATCH");
  }
}

export function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}
