import type { CliCommand, CliFlag, ParsedArgs } from "./types";

// Define flags within the parser module
export const globalFlags: CliFlag[] = [
  {
    names: ["--help", "-h"],
    description: "Show this help message.",
    type: "special",
    expectsValue: false,
  },
  {
    names: ["--version", "-v"],
    description: "Show the CLI version.",
    type: "special",
    expectsValue: false,
  },
  {
    names: ["--logger"],
    description: "Set log level (error, warn, info, debug).",
    type: "string",
    expectsValue: true,
  },
  {
    names: ["--config"],
    description: "Specify path to configuration file.",
    type: "string",
    expectsValue: true,
  },
  {
    names: ["--url"],
    description:
      "Target URL to test (optional, can be passed via runner input).",
    type: "string",
    expectsValue: true,
  },
  {
    names: ["--region"],
    description: "Region identifier (optional).",
    type: "string",
    expectsValue: true,
  },
  {
    names: ["-y"],
    description: "Skip confirmation prompts (use with caution).",
    type: "boolean",
    expectsValue: false,
  },
  {
    names: ["--no-exit"],
    description:
      "Don't exit after tests complete (useful for testing/debugging).",
    type: "boolean",
    expectsValue: false,
  },
];

const DOUBLE_DASH_REGEX = /^--/;
const SINGLE_DASH_REGEX = /^-/;
/**
 * Parses raw command line arguments into structured flags, command name, and command args.
 *
 * @param rawArgs - Raw arguments from process.argv.slice(2).
 * @param commands - The list of available CLI commands (needed to identify command name).
 * @returns A ParsedArgs object.
 */
export function parseCliArgs(
  rawArgs: string[],
  commands: CliCommand[]
): ParsedArgs {
  const parsedFlags: Record<string, string | boolean | undefined> = {};
  let commandName: string | undefined;
  const commandArgs: string[] = [];

  // Initialize flags
  for (const flag of globalFlags) {
    const primaryName = flag.names[0]
      ?.replace(DOUBLE_DASH_REGEX, "")
      .replace(SINGLE_DASH_REGEX, "");
    if (primaryName) {
      parsedFlags[primaryName] = flag.type === "boolean" ? false : undefined;
    }
  }

  // First pass: Identify flags and their values
  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (typeof arg !== "string") {
      continue;
    }

    // Check if this is a flag
    if (DOUBLE_DASH_REGEX.test(arg) || SINGLE_DASH_REGEX.test(arg)) {
      const flagName = arg
        .replace(DOUBLE_DASH_REGEX, "")
        .replace(SINGLE_DASH_REGEX, "");
      const flag = globalFlags.find((f) =>
        f.names.some((name) => name.replace(DOUBLE_DASH_REGEX, "") === flagName)
      );

      if (flag) {
        const primaryName = flag.names[0]
          ?.replace(DOUBLE_DASH_REGEX, "")
          .replace(SINGLE_DASH_REGEX, "");
        if (primaryName) {
          if (flag.expectsValue && i + 1 < rawArgs.length) {
            parsedFlags[primaryName] = rawArgs[i + 1];
            i += 1; // Skip the next argument as it's the value
          } else if (flag.type === "boolean") {
            parsedFlags[primaryName] = true;
          }
        }
      }
    } else if (commandName) {
      // We already have a command, this is an arg
      commandArgs.push(arg);
    } else {
      // Check if it's a known command
      const isCommand = commands.some((cmd) => cmd.name === arg);
      if (isCommand) {
        commandName = arg;
      } else {
        // Not a command, treat as arg (will be ignored if no command found)
        commandArgs.push(arg);
      }
    }
  }

  return {
    commandName,
    commandArgs,
    parsedFlags,
  };
}
