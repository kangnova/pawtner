import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: number) {
  return NextResponse.json({ ok: true, data }, { status: init ?? 200 });
}

export function fail(error: string, init?: number) {
  return NextResponse.json({ ok: false, error }, { status: init ?? 400 });
}
