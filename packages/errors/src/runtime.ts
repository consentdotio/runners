import { RunnerError, isError } from './base';

/**
 * Thrown when a runner execution times out.
 *
 * This error occurs when a runner takes longer than the configured timeout
 * to complete execution.
 *
 * @example
 * ```ts
 * try {
 *   await runRunners({ url, runners, timeout: 5000 });
 * } catch (error) {
 *   if (error instanceof RunnerTimeoutError) {
 *     console.error(`Runner "${error.runnerName}" timed out after ${error.timeout}ms`);
 *   }
 * }
 * ```
 */
export class RunnerTimeoutError extends RunnerError {
  runnerName: string;
  timeout: number;

  constructor(runnerName: string, timeout: number, options?: { cause?: unknown }) {
    super(`Runner "${runnerName}" exceeded timeout of ${timeout}ms`, {
      cause: options?.cause,
    });
    this.name = 'RunnerTimeoutError';
    this.runnerName = runnerName;
    this.timeout = timeout;
  }

  static is(value: unknown): value is RunnerTimeoutError {
    return isError(value) && value.name === 'RunnerTimeoutError';
  }
}

/**
 * Thrown when a runner execution fails.
 *
 * This error occurs when a runner throws an error during execution.
 * The `cause` property contains the underlying error.
 *
 * @example
 * ```ts
 * try {
 *   await runRunners({ url, runners });
 * } catch (error) {
 *   if (error instanceof RunnerExecutionError) {
 *     console.error(`Runner "${error.runnerName}" failed:`, error.cause);
 *   }
 * }
 * ```
 */
export class RunnerExecutionError extends RunnerError {
  runnerName: string;
  declare cause: Error;

  constructor(runnerName: string, error: Error | unknown) {
    const causeError = error instanceof Error ? error : new Error(String(error));
    super(`Runner "${runnerName}" execution failed: ${causeError.message}`, {
      cause: causeError,
    });
    this.name = 'RunnerExecutionError';
    this.runnerName = runnerName;
  }

  static is(value: unknown): value is RunnerExecutionError {
    return isError(value) && value.name === 'RunnerExecutionError';
  }
}

