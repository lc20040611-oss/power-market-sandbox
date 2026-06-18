import { NextResponse } from "next/server";

import { listExperiments, saveExperimentConfig } from "@/lib/server/experiment-db";
import type { ExperimentConfig } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ experiments: listExperiments() });
}

export async function POST(request: Request) {
  const config = (await request.json()) as ExperimentConfig;
  const saved = saveExperimentConfig(config);
  return NextResponse.json(saved);
}
