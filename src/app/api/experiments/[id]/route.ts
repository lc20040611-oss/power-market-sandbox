import { NextResponse } from "next/server";

import { getExperimentVersions } from "@/lib/server/experiment-db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return NextResponse.json({ versions: getExperimentVersions(params.id) });
}
