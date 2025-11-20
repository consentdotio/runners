import type { RunnerTestContext } from './types.js';

export function createContext(
  page: import('playwright').Page,
  url: string,
  options: {
    region?: string;
    runId?: string;
  }
): RunnerTestContext {
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
    page,
    url,
    region: options.region,
    runId: options.runId,
    log,
  };
}
