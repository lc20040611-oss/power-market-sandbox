import { NextResponse } from "next/server";

import { listExperiments, saveExperimentConfig } from "@/lib/server/experiment-db";
import type { ExperimentConfig } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ experiments: listExperiments() });
  } catch (error) {
    console.error("[api/experiments] list failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const config = (await request.json()) as ExperimentConfig;
    const saved = saveExperimentConfig(config);
    return NextResponse.json(saved);
  } catch (error) {
    console.error("[api/experiments] save failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
