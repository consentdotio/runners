import type { CliLogger } from "../utils/logger";
import type { FrameworkDetectionResult } from "./framework-detection";
import type { PackageManagerResult } from "./package-manager-detection";

// --- Command Definition ---
export type CliCommand = {
  name: string;
  label: string; // For prompts
  hint: string; // For prompts
  description: string; // For help text (optional)
  // Action now takes CliContext
  action: (context: CliContext) => Promise<void>;
};

// --- Flag Definition ---
export type FlagType = "boolean" | "string" | "special"; // 'special' for help/version

export type CliFlag = {
  names: string[]; // e.g., ['--help', '-h']
  description: string;
  type: FlagType;
  expectsValue: boolean;
};

// --- Parsed Args Definition ---
export type ParsedArgs = {
  commandName: string | undefined;
  commandArgs: string[];
  // Store flags by their primary name (e.g., 'help', 'logger')
  parsedFlags: Record<string, string | boolean | undefined>;
};

// --- Package Info ---
export type PackageInfo = {
  name: string;
  version: string;
  [key: string]: unknown;
};

// --- Error Handling Helpers ---
export type ErrorHandlers = {
  handleError: (error: unknown, message: string) => never;
  handleCancel: (
    message?: string,
    context?: { command?: string; stage?: string }
  ) => never;
};

// --- Config Management ---
export type ConfigManagement = {
  loadConfig: () => Promise<unknown | null>;
  requireConfig: () => Promise<unknown>;
  getPathAliases: (configPath?: string) => Record<string, string> | null;
};

// --- File System Utilities ---
export type FileSystemUtils = {
  getPackageInfo: () => PackageInfo;
};

// --- CLI Context Definition ---
export type CliContext = {
  logger: CliLogger;
  flags: ParsedArgs["parsedFlags"];
  commandName: string | undefined;
  commandArgs: string[];
  cwd: string;

  // Shared utilities
  error: ErrorHandlers;
  config: ConfigManagement;
  fs: FileSystemUtils;

  // Utilities for user interaction
  confirm: (message: string, initialValue: boolean) => Promise<boolean>;

  projectRoot: string;
  framework: FrameworkDetectionResult;
  packageManager: PackageManagerResult;
};
