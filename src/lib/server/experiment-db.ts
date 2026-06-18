import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type {
  ExperimentConfig,
  ExperimentRecordSummary,
  ExperimentRunArchiveRecord,
  ExperimentRunRecord,
  ExperimentRunSummary,
  ExperimentVersionRecord
} from "../types";

const dataDir = join(process.cwd(), ".data");
const dbPath = join(dataDir, "experiments.sqlite");

let database: DatabaseSync | null = null;
let initialized = false;

function getDatabase() {
  if (!database) {
    mkdirSync(dataDir, { recursive: true });
    database = new DatabaseSync(dbPath);
  }

  if (!initialized) {
    database.exec(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS experiments (
        id TEXT PRIMARY KEY,
        experiment_name TEXT NOT NULL,
        research_question TEXT NOT NULL,
        base_scenario TEXT NOT NULL,
        notes TEXT NOT NULL,
        latest_version INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS experiment_versions (
        id TEXT PRIMARY KEY,
        experiment_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        config_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (experiment_id, version)
      );

      CREATE TABLE IF NOT EXISTS experiment_runs (
        id TEXT PRIMARY KEY,
        experiment_id TEXT NOT NULL,
        experiment_version INTEGER NOT NULL,
        run_at TEXT NOT NULL,
        summary_json TEXT NOT NULL,
        record_json TEXT NOT NULL
      );
    `);
    initialized = true;
  }

  return database;
}

function rowToSummary(row: Record<string, unknown>): ExperimentRecordSummary {
  return {
    id: String(row.id),
    experimentName: String(row.experiment_name),
    researchQuestion: String(row.research_question),
    baseScenario: String(row.base_scenario),
    latestVersion: Number(row.latest_version),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export function listExperiments() {
  const db = getDatabase();
  const statement = db.prepare(`
    SELECT id, experiment_name, research_question, base_scenario, latest_version, created_at, updated_at
    FROM experiments
    ORDER BY updated_at DESC
  `);

  return statement.all().map((row) => rowToSummary(row as Record<string, unknown>));
}

export function getExperimentVersions(experimentId: string) {
  const db = getDatabase();
  const statement = db.prepare(`
    SELECT experiment_id, version, config_json, created_at
    FROM experiment_versions
    WHERE experiment_id = ?
    ORDER BY version DESC
  `);

  return statement.all(experimentId).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      experimentId: String(record.experiment_id),
      version: Number(record.version),
      config: JSON.parse(String(record.config_json)) as ExperimentConfig,
      createdAt: String(record.created_at)
    } satisfies ExperimentVersionRecord;
  });
}

export function saveExperimentConfig(config: ExperimentConfig) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const existing = db
    .prepare("SELECT latest_version, created_at FROM experiments WHERE id = ?")
    .get(config.id) as { latest_version?: number; created_at?: string } | undefined;
  const version = Number(existing?.latest_version ?? 0) + 1;

  db.prepare(`
    INSERT INTO experiments (id, experiment_name, research_question, base_scenario, notes, latest_version, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      experiment_name = excluded.experiment_name,
      research_question = excluded.research_question,
      base_scenario = excluded.base_scenario,
      notes = excluded.notes,
      latest_version = excluded.latest_version,
      updated_at = excluded.updated_at
  `).run(
    config.id,
    config.experimentName,
    config.researchQuestion,
    config.baseScenario,
    config.notes,
    version,
    existing?.created_at ?? now,
    now
  );

  db.prepare(`
    INSERT INTO experiment_versions (id, experiment_id, version, config_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `${config.id}-v${version}`,
    config.id,
    version,
    JSON.stringify(config),
    now
  );

  return { version, updatedAt: now };
}

export function saveExperimentRun(
  experimentId: string,
  experimentVersion: number,
  record: ExperimentRunRecord
) {
  const db = getDatabase();
  const runId = record.recordId ?? `${experimentId}-${Date.now()}`;
  const summary: ExperimentRunSummary = {
    experimentId: record.experimentId,
    experimentName: record.experimentName,
    researchQuestion: record.researchQuestion,
    runAt: record.runAt,
    baseScenario: record.baseScenario,
    parameterLabel: record.variableParameters.map((item) => item.label).join(" + "),
    resultCount: record.results.length,
    sourceVersion: experimentVersion
  };

  const archivedRecord: ExperimentRunRecord = {
    ...record,
    recordId: runId,
    sourceVersion: experimentVersion
  };

  db.prepare(`
    INSERT INTO experiment_runs (id, experiment_id, experiment_version, run_at, summary_json, record_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    runId,
    experimentId,
    experimentVersion,
    record.runAt,
    JSON.stringify(summary),
    JSON.stringify(archivedRecord)
  );

  db.prepare("UPDATE experiments SET updated_at = ? WHERE id = ?").run(record.runAt, experimentId);

  return archivedRecord;
}

export function listExperimentRuns(experimentId: string) {
  const db = getDatabase();
  const statement = db.prepare(`
    SELECT id, experiment_id, experiment_version, run_at, summary_json, record_json
    FROM experiment_runs
    WHERE experiment_id = ?
    ORDER BY run_at DESC
  `);

  return statement.all(experimentId).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: String(record.id),
      experimentId: String(record.experiment_id),
      experimentVersion: Number(record.experiment_version),
      runAt: String(record.run_at),
      summary: JSON.parse(String(record.summary_json)) as ExperimentRunSummary,
      record: JSON.parse(String(record.record_json)) as ExperimentRunRecord
    } satisfies ExperimentRunArchiveRecord;
  });
}
