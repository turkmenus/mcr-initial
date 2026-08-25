import { NextRequest, NextResponse } from "next/server";

const RENDERER_URL =
  process.env.INTERNAL_RENDERER_URL ||
  (process.env.NODE_ENV === "production" ? "http://renderer:4002" : "http://127.0.0.1:4002");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await fetch(`${RENDERER_URL}/api/render/jobs/${id}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Job not found" }));
      return NextResponse.json(err, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Renderer service is currently offline or unreachable." },
      { status: 503 }
    );
  }
}
