import fs from "node:fs/promises";
import path from "node:path";

import type { CliLogger } from "~/utils/logger";

/**
 * Framework detection result
 */
export type FrameworkDetectionResult = {
  framework: string | null;
  frameworkVersion: string | null;
  pkg: string;
  hasReact: boolean;
  reactVersion: string | null;
};

/**
 * Detects the framework and React usage in the project
 *
 * @param projectRoot - The root directory of the project
 * @param logger - Optional logger instance for debug messages
 * @returns Object containing framework info and whether React is used
 */
export async function detectFramework(
  projectRoot: string,
  logger?: CliLogger
): Promise<FrameworkDetectionResult> {
  try {
    logger?.debug(`Detecting framework in ${projectRoot}`);
    const packageJsonPath = path.join(projectRoot, "package.json");
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const hasReact = "react" in deps;
    const reactVersion = hasReact ? deps.react : null;
    logger?.debug(
      `React detected: ${hasReact}${reactVersion ? ` (version: ${reactVersion})` : ""}`
    );

    let framework: string | null = null;
    let frameworkVersion: string | null = null;
    let pkg = "unknown";

    if ("next" in deps) {
      framework = "Next";
      frameworkVersion = deps.next;
      pkg = "next";
    } else if ("@remix-run/react" in deps) {
      framework = "Remix";
      frameworkVersion = deps["@remix-run/react"];
      pkg = "remix";
    } else if (
      "@vitejs/plugin-react" in deps ||
      "@vitejs/plugin-react-swc" in deps
    ) {
      framework = "Vite + React";
      frameworkVersion =
        deps["@vitejs/plugin-react"] || deps["@vitejs/plugin-react-swc"];
      pkg = "vite";
    } else if ("gatsby" in deps) {
      framework = "Gatsby";
      frameworkVersion = deps.gatsby;
      pkg = "gatsby";
    } else if (hasReact) {
      framework = "React";
      frameworkVersion = reactVersion;
      pkg = "react";
    }

    logger?.debug(
      `Detected framework: ${framework}${frameworkVersion ? ` (version: ${frameworkVersion})` : ""}, ` +
        `package: ${pkg}`
    );
    return { framework, frameworkVersion, pkg, hasReact, reactVersion };
  } catch (error) {
    logger?.debug(
      `Framework detection failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return {
      framework: null,
      frameworkVersion: null,
      pkg: "unknown",
      hasReact: false,
      reactVersion: null,
    };
  }
}

/**
 * Detects the project root by finding the package.json file
 *
 * @param cwd - Current working directory
 * @param logger - Optional logger instance for debug messages
 * @returns The project root directory path or cwd if not found
 */
export async function detectProjectRoot(
  cwd: string,
  logger?: CliLogger
): Promise<string> {
  let currentDir = cwd;

  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, "package.json");
    try {
      await fs.access(packageJsonPath);
      logger?.debug(`Found project root at: ${currentDir}`);
      return currentDir;
    } catch {
      // Continue searching up the directory tree
    }
    currentDir = path.dirname(currentDir);
  }

  logger?.debug(`No package.json found, using cwd as project root: ${cwd}`);
  return cwd;
}
