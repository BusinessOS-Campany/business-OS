import { NextResponse } from "next/server";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; errors?: Record<string, string[]> };

export function success<T>(message?: string, data?: T): ActionResult<T> {
  return data === undefined ? { ok: true, message } : { ok: true, message, data };
}

export function failure(error: string, errors?: Record<string, string[]>): ActionResult {
  return errors ? { ok: false, error, errors } : { ok: false, error };
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}