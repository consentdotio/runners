/**
 * @internal
 * Check if a value is an Error without relying on Node.js utilities.
 * This is needed for error classes that can be used in VM contexts where
 * Node.js imports are not available.
 */
export function isError(
  value: unknown
): value is { name: string; message: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "message" in value
  );
}

/**
 * The base class for all Runner-related errors.
 *
 * This error is thrown by the Runners SDK when internal operations fail.
 * You can use this class with `instanceof` to catch any Runners SDK error.
 *
 * @example
 * ```ts
 * try {
 *   await runRunners({ url, runners });
 * } catch (error) {
 *   if (error instanceof RunnerError) {
 *     console.error('Runners SDK error:', error.message);
 *   }
 * }
 * ```
 */
export class RunnerError extends Error {
  readonly cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.cause = options?.cause;
    this.name = "RunnerError";

    if (options?.cause instanceof Error) {
      this.stack = `${this.stack}\nCaused by: ${options.cause.stack}`;
    }
  }

  static is(value: unknown): value is RunnerError {
    return isError(value) && value.name === "RunnerError";
  }
}
