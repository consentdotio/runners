#!/usr/bin/env node

import { isCancel, select } from "@clack/prompts";
import { showHelpMenu } from "./actions/show-help-menu";
import { run } from "./commands/run";
import { displayIntro } from "./components/intro";

// Import context creator and types
import { createCliContext } from "./context/creator";
import { globalFlags } from "./context/parser";
import type { CliCommand } from "./context/types";
import { formatLogMessage } from "./utils/logger";

// Export CLI-specific utilities
export { loadRunners } from "./utils/load-runners";

// Define commands (using types from context)
const commands: CliCommand[] = [
  {
    name: "run",
    label: "Run",
    hint: "Run tests",
    description: "Run tests against a URL",
    action: (context) => run(context),
  },
];

export async function main() {
  // --- Context Setup ---
  const rawArgs = process.argv.slice(2);
  const cwd = process.cwd();
  // Pass commands array to creator, as parser needs it
  const context = await createCliContext(rawArgs, cwd, commands);
  const { logger, flags, commandName, commandArgs, error } = context;

  // --- Package Info & Early Exit Check ---
  const packageInfo = context.fs.getPackageInfo();
  const version = packageInfo.version;

  if (flags.version) {
    logger.debug("Version flag detected");
    logger.message(`CLI version ${version}`);
    process.exit(0);
  }

  if (flags.help) {
    logger.debug("Help flag detected. Displaying help and exiting.");
    showHelpMenu(context, version, commands, globalFlags);
    process.exit(0);
  }

  // --- Regular Execution Flow ---
  logger.debug("Raw process arguments:", process.argv);
  logger.debug("Parsed command name:", commandName);
  logger.debug("Parsed command args:", commandArgs);
  logger.debug("Parsed global flags:", flags);

  // Display intro
  await displayIntro(context, version);

  // --- Execute Command or Show Interactive Menu ---
  try {
    if (commandName) {
      const command = commands.find((cmd) => cmd.name === commandName);
      if (command) {
        logger.info(`Executing command: ${command.name}`);
        await command.action(context);
      } else {
        logger.error(`Unknown command: ${commandName}`);
        logger.info("Run --help to see available commands.");
        process.exit(1);
      }
    } else {
      logger.debug("No command specified, entering interactive selection.");

      const promptOptions = commands.map((cmd) => ({
        value: cmd.name,
        label: cmd.label,
        hint: cmd.hint,
      }));
      promptOptions.push({
        value: "exit",
        label: "exit",
        hint: "Close the CLI",
      });

      const selectedCommandName = await select({
        message: formatLogMessage(
          "info",
          "Which command would you like to run?"
        ),
        options: promptOptions,
      });

      if (isCancel(selectedCommandName) || selectedCommandName === "exit") {
        logger.debug("Interactive selection cancelled or exit chosen.");
        context.error.handleCancel("Operation cancelled.", {
          command: "interactive_menu",
          stage: "exit",
        });
      } else {
        const selectedCommand = commands.find(
          (cmd) => cmd.name === selectedCommandName
        );
        if (selectedCommand) {
          logger.debug(`User selected command: ${selectedCommand.name}`);
          await selectedCommand.action(context);
        } else {
          error.handleError(
            new Error(`Command '${selectedCommandName}' not found`),
            "An internal error occurred"
          );
        }
      }
    }
    logger.debug("Command execution completed");
  } catch (executionError) {
    error.handleError(
      executionError,
      "An unexpected error occurred during command execution"
    );
  }
}

main();
