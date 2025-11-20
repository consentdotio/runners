import color from 'picocolors';
import type { CliCommand, CliContext, CliFlag } from '~/context/types';

/**
 * Displays the CLI help menu, generating commands and options dynamically.
 *
 * @param context The CLI context
 * @param version The current CLI version.
 * @param commands The array of available CLI commands.
 * @param flags The array of available global CLI flags.
 */
export function showHelpMenu(
  context: CliContext,
  version: string,
  commands: CliCommand[],
  flags: CliFlag[]
): void {
  const { logger } = context;
  logger.debug('Displaying help menu using command and flag structures.');

  const commandLines = commands
    .map((cmd) => `  ${cmd.name.padEnd(10)} ${cmd.description}`)
    .join('\n');

  // Dynamically generate the options list
  const optionLines = flags
    .map((flag) => {
      const names = flag.names.join(', ');
      // Add placeholder for flags expecting values
      const valuePlaceholder = flag.expectsValue ? ' <value>' : '';
      return `  ${(names + valuePlaceholder).padEnd(20)} ${flag.description}`;
    })
    .join('\n');

  const helpContent = `CLI version ${version}

Available Commands:
${commandLines || '  (no commands configured)'}

Options:
${optionLines}

Run a command directly or select one interactively when no command is provided.`;

  logger.debug('Help menu content generated.');
  logger.note(helpContent, 'Usage');
}

