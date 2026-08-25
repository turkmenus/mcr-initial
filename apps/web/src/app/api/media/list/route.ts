import { NextResponse } from "next/server";

const RENDERER_URL =
  process.env.INTERNAL_RENDERER_URL ||
  (process.env.NODE_ENV === "production" ? "http://renderer:4002" : "http://127.0.0.1:4002");

export async function GET() {
  try {
    const res = await fetch(`${RENDERER_URL}/api/media/list`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json([]);
    }
    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch {
    // Graceful fallback when renderer service is offline or initializing
    return NextResponse.json([]);
  }
}
