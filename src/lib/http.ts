import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
}

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  if (message === "UNAUTHORIZED") return fail("Please log in to continue.", 401);
  if (message === "PASSWORD_CHANGE_REQUIRED") return fail("Change your initial password before using the business workspace.", 403);
  if (message.startsWith("VALIDATION:")) return fail(message.slice(11), 400);
  if (message.startsWith("NOT_FOUND:")) return fail(message.slice(10), 404);
  if (message.startsWith("CONFLICT:")) return fail(message.slice(9), 409);
  if (message.startsWith("INSUFFICIENT_STOCK:")) return fail(message.slice(19), 409);
  console.error("API error:", error);
  return fail("The request could not be completed. Check your input and try again.", 500);
}
