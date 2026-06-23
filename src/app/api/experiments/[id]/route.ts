import { NextResponse } from "next/server";

import { getExperimentVersions } from "@/lib/server/experiment-db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    return NextResponse.json({ versions: getExperimentVersions(params.id) });
  } catch (error) {
    console.error("[api/experiments/:id] list versions failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
