import { RunnerError, isError } from './base';

/**
 * Thrown when one or more requested runners are not found.
 *
 * This error occurs when trying to run runners that don't exist
 * in the discovered runners map.
 *
 * @example
 * ```ts
 * try {
 *   await runRunners({ url, runners: ['nonExistentRunner'] });
 * } catch (error) {
 *   if (error instanceof RunnerNotFoundError) {
 *     console.error('Missing runners:', error.missingRunners);
 *     console.error('Available runners:', error.availableRunners);
 *   }
 * }
 * ```
 */
export class RunnerNotFoundError extends RunnerError {
  missingRunners: string[];
  availableRunners: string[];

  constructor(missingRunners: string[], availableRunners: string[]) {
    super(
      `One or more runners not found: ${missingRunners.join(', ')}`,
      {}
    );
    this.name = 'RunnerNotFoundError';
    this.missingRunners = missingRunners;
    this.availableRunners = availableRunners;
  }

  static is(value: unknown): value is RunnerNotFoundError {
    return isError(value) && value.name === 'RunnerNotFoundError';
  }
}

