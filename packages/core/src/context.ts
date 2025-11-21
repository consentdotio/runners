import type { RunnerContext } from "./types";

export function createContext(options: {
  region?: string;
  runId?: string;
}): RunnerContext {
  const log = (message: string, meta?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      message,
      ...meta,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(logEntry));
  };

  return {
    region: options.region,
    runId: options.runId,
    log,
  };
}
