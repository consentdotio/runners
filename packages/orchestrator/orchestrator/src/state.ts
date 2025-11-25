import type { RunSummary } from "./types";

/**
 * In-memory storage for run state
 */
type RunState = {
  status: "running" | "completed" | "failed";
  summary?: RunSummary;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
};

const runStorage = new Map<string, RunState>();

/**
 * Store a new run in memory
 */
export function storeRun(runId: string, createdAt: Date = new Date()): void {
  runStorage.set(runId, {
    status: "running",
    createdAt,
    updatedAt: createdAt,
  });
}

/**
 * Get run state from memory
 */
export function getRun(runId: string): RunState | undefined {
  return runStorage.get(runId);
}

/**
 * Update run state in memory
 */
export function updateRun(
  runId: string,
  updates: {
    status?: "running" | "completed" | "failed";
    summary?: RunSummary;
    error?: string;
  }
): void {
  const existing = runStorage.get(runId);
  if (!existing) {
    throw new Error(`Run ${runId} not found`);
  }

  runStorage.set(runId, {
    ...existing,
    ...updates,
    updatedAt: new Date(),
  });
}

