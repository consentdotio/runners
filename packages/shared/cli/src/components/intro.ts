import color from "picocolors";
import type { CliContext } from "~/context/types";

/**
 * Displays the CLI introduction sequence, including
 * welcome message and version.
 * @param context - The CLI context
 * @param version - The CLI version string.
 */
export function displayIntro(context: CliContext, _version: string): void {
  const { logger } = context;

  logger.info(`${color.bold("Welcome!")} Let's get started.`);
  logger.message("");
}
