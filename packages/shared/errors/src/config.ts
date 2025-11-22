import { RunnerError, isError } from "./base";

/**
 * Thrown when runner configuration is invalid.
 *
 * This error occurs when required configuration options are missing
 * or invalid.
 *
 * @example
 * ```ts
 * try {
 *   await runRunners({ runners: [] }); // Missing url
 * } catch (error) {
 *   if (error instanceof RunnerConfigError) {
 *     console.error('Configuration error:', error.message);
 *   }
 * }
 * ```
 */
export class RunnerConfigError extends RunnerError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(`Configuration error: ${message}`, {
      cause: options?.cause,
    });
    this.name = "RunnerConfigError";
  }

  static is(value: unknown): value is RunnerConfigError {
    return isError(value) && value.name === "RunnerConfigError";
  }
}
