import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Writes debug information to a JSON file for troubleshooting build issues.
 * Executes whenever called, regardless of environment variables.
 *
 * @param outfile - Path to the output file (debug file will be `${outfile}.debug.json`)
 * @param debugData - Data to write to the debug file
 * @param merge - If true, merges with existing debug file content
 */
export async function writeDebugFile(
  outfile: string,
  debugData: object,
  merge = false
): Promise<void> {
  try {
    const debugFilePath = `${outfile}.debug.json`;
    // Ensure directory exists
    await mkdir(dirname(debugFilePath), { recursive: true });

    let existing = {};

    if (merge) {
      try {
        const existingContent = await readFile(debugFilePath, "utf-8");
        existing = JSON.parse(existingContent);
      } catch {
        // File doesn't exist or is invalid JSON, start fresh
        existing = {};
      }
    }

    await writeFile(
      debugFilePath,
      JSON.stringify(
        {
          ...existing,
          ...debugData,
          _timestamp: new Date().toISOString(),
        },
        null,
        2
      ),
      "utf-8"
    );
  } catch (error: unknown) {
    // Don't throw - debug file generation is non-critical
    const errorMessage = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.warn(`[runners] Failed to write debug file: ${errorMessage}`);
  }
}

/**
 * Normalizes file paths to forward slashes for cross-platform compatibility.
 * Critical for Windows where paths contain backslashes.
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

const TRAILING_SLASH_REGEX = /\/$/;

/**
 * Calculates relative path from working directory to file, handling Windows edge cases.
 *
 * @param workingDir - The working directory (absolute path)
 * @param filePath - The file path (absolute or relative)
 * @returns Normalized relative path
 */
export function getRelativePath(workingDir: string, filePath: string): string {
  // Normalize paths to forward slashes
  const normalizedWorkingDir = normalizePath(workingDir).replace(
    TRAILING_SLASH_REGEX,
    ""
  );
  const normalizedPath = normalizePath(filePath);

  // Windows fix: Use case-insensitive comparison to work around drive letter casing issues
  const lowerWd = normalizedWorkingDir.toLowerCase();
  const lowerPath = normalizedPath.toLowerCase();

  if (lowerPath.startsWith(`${lowerWd}/`)) {
    // File is under working directory - manually calculate relative path
    return normalizedPath.substring(normalizedWorkingDir.length + 1);
  }
  if (lowerPath === lowerWd) {
    // File IS the working directory
    return ".";
  }
  // Use relative() for files outside working directory
  const { relative } = require("node:path");
  let relativePath = normalizePath(relative(workingDir, filePath));

  // Handle files discovered outside the working directory
  if (relativePath.startsWith("../")) {
    relativePath = relativePath
      .split("/")
      .filter((part) => part !== "..")
      .join("/");
  }

  // Final safety check - ensure we never return an absolute path
  if (relativePath.includes(":") || relativePath.startsWith("/")) {
    // This should never happen, but if it does, use just the filename as last resort
    // eslint-disable-next-line no-console
    console.error(
      `[runners] WARNING: relativePath is still absolute: ${relativePath}`
    );
    return normalizedPath.split("/").pop() || "unknown.ts";
  }

  return relativePath;
}
