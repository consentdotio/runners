import { isError, RunnerError } from "./base";

/**
 * Thrown when runner discovery fails.
 *
 * This error occurs when there are issues discovering or loading runner files.
 *
 * @example
 * ```ts
 * try {
 *   await discoverRunners();
 * } catch (error) {
 *   if (error instanceof RunnerDiscoveryError) {
 *     console.error('Discovery failed:', error.errors);
 *   }
 * }
 * ```
 */
export class RunnerDiscoveryError extends RunnerError {
  errors: Array<{ file: string; error: string }>;

  constructor(errors: Array<{ file: string; error: string }>) {
    const errorCount = errors.length;
    const errorSummary = errors
      .slice(0, 3)
      .map((e) => `${e.file}: ${e.error}`)
      .join("; ");
    const more = errorCount > 3 ? ` and ${errorCount - 3} more` : "";

    super(
      `Failed to discover runners: ${errorCount} file(s) failed to load. ${errorSummary}${more}`,
      {}
    );
    this.name = "RunnerDiscoveryError";
    this.errors = errors;
  }

  static is(value: unknown): value is RunnerDiscoveryError {
    return isError(value) && value.name === "RunnerDiscoveryError";
  }
}

/**
 * Thrown when no runners are found.
 *
 * This error occurs when runner discovery completes but no runners
 * are found in the specified pattern.
 *
 * @example
 * ```ts
 * try {
 *   const runners = await discoverRunners('src/**\/*.ts');
 *   if (runners.size === 0) {
 *     throw new NoRunnersFoundError('src/**\/*.ts');
 *   }
 * } catch (error) {
 *   if (error instanceof NoRunnersFoundError) {
 *     console.error(`No runners found in pattern: ${error.pattern}`);
 *   }
 * }
 * ```
 */
export class NoRunnersFoundError extends RunnerError {
  pattern: string;

  constructor(pattern: string) {
    super(
      `No runners found. Make sure you have runner files with "use runner" directive in ${pattern}`,
      {}
    );
    this.name = "NoRunnersFoundError";
    this.pattern = pattern;
  }

  static is(value: unknown): value is NoRunnersFoundError {
    return isError(value) && value.name === "NoRunnersFoundError";
  }
}
