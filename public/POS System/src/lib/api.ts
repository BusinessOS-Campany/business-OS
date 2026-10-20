import { NextResponse } from "next/server";

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function created(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ success: false, error: message, details }, { status });
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ success: false, error: message }, { status: 404 });
}

export function serverError(message = "Internal server error") {
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}

export function zodErrors(e: { issues?: readonly { path: ReadonlyArray<PropertyKey>; message: string }[] }): string {
  const issues = e.issues ?? [];
  if (issues.length === 0) return "Invalid input";
  return issues.map((er) => `${er.path.join(".")}: ${er.message}`).join("; ");
}

export function parseBody<T>(body: unknown): T {
  return body as T;
}

export function getIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "";
}