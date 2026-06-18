import { NextResponse } from "next/server";

import { listExperimentRuns, saveExperimentRun } from "@/lib/server/experiment-db";
import type { ExperimentRunRecord } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return NextResponse.json({ runs: listExperimentRuns(params.id) });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const payload = (await request.json()) as {
    experimentVersion: number;
    record: ExperimentRunRecord;
  };

  const archived = saveExperimentRun(params.id, payload.experimentVersion, payload.record);
  return NextResponse.json({ record: archived });
}
