import { dirname, join, relative, resolve } from "node:path";
import {
  getTsConfigOptions,
  normalizePath,
  writeDebugFile,
} from "@runners/core";
import chalk from "chalk";
import { build, context } from "esbuild";
import { glob } from "glob";
import type { RunnerManifest } from "./apply-swc-transform";
import { createDiscoverRunnersPlugin } from "./discover-plugin";
import { createSwcPlugin } from "./swc-esbuild-plugin";
import type { RunnerBuilderConfig } from "./types";

const EMIT_SOURCEMAPS_FOR_DEBUGGING =
  process.env.RUNNERS_EMIT_SOURCEMAPS_FOR_DEBUGGING === "1";

const PATH_SEPARATOR_REGEX = /\\/g;
const TRAILING_SLASH_REGEX = /\/$/;

/**
 * Determines if we should use production optimizations.
 * Production mode is enabled when NODE_ENV=production or explicitly set.
 */
function isProduction(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.RUNNERS_PRODUCTION === "1"
  );
}

/**
 * Gets build options with production optimizations if applicable.
 */
function getBuildOptions(options: {
  minify?: boolean;
  sourcemap?: boolean | "inline";
  tsPaths?: Record<string, string[]>;
  tsBaseUrl?: string;
  runnerManifest?: RunnerManifest;
  entriesToBundle?: string[];
  outdir?: string;
}): {
  minify: boolean;
  sourcemap: boolean | "inline";
  plugins: ReturnType<typeof createSwcPlugin>[];
} {
  const production = isProduction();
  const minify = options.minify ?? production;

  let sourcemap: boolean | "inline";
  if (options.sourcemap !== undefined) {
    sourcemap = options.sourcemap;
  } else if (production) {
    sourcemap = false;
  } else {
    sourcemap = EMIT_SOURCEMAPS_FOR_DEBUGGING ? "inline" : false;
  }

  const plugins = [
    createSwcPlugin({
      tsPaths: options.tsPaths,
      tsBaseUrl: options.tsBaseUrl,
      minify,
      sourceMaps: !!sourcemap,
      entriesToBundle: options.entriesToBundle,
      outdir: options.outdir,
      runnerManifest: options.runnerManifest,
    }),
  ];

  return {
    minify,
    sourcemap,
    plugins,
  };
}

const ALIAS_KEY_REGEX = /\/\*$/;
const ALIAS_PATH_REGEX = /\/\*$/;

/**
 * Base class for runners builders. Provides common build logic for bundling
 * runner files into deployable bundles using esbuild and SWC.
 */
export class BaseBuilder {
  protected config: RunnerBuilderConfig;
  private buildContext: Awaited<ReturnType<typeof context>> | null = null;

  constructor(config: RunnerBuilderConfig) {
    this.config = config;
  }

  /**
   * Starts watch mode for incremental rebuilds.
   * Only works if config.watch is true.
   */
  async watch(): Promise<void> {
    if (!this.config.watch) {
      return;
    }

    if (this.buildContext) {
      // Already watching
      return;
    }

    const inputFiles = await this.getInputFiles();
    const outfile = join(this.config.outDir, "runners.mjs");
    await this.createRunnersBundleContext({
      inputFiles,
      outfile,
      format: "esm",
    });

    if (this.buildContext) {
      // @ts-expect-error - watch() exists on BuildContext but types may be incomplete
      await this.buildContext.watch();
      // eslint-disable-next-line no-console
      console.log(chalk.green("[runners/builders] Watch mode enabled"));
    }
  }

  /**
   * Stops watch mode.
   */
  async stop(): Promise<void> {
    if (this.buildContext) {
      await this.buildContext.dispose();
      this.buildContext = null;
    }
  }

  /**
   * Performs the complete build process for runners.
   * Subclasses must implement this to define their specific build steps.
   */
  async build(): Promise<void> {
    const inputFiles = await this.getInputFiles();
    const outfile = join(this.config.outDir, "runners.mjs");
    await this.createRunnersBundle({
      inputFiles,
      outfile,
      format: "esm",
    });
  }

  /**
   * Discovers all runner files in the configured patterns.
   * Searches for TypeScript and JavaScript files while excluding common build
   * and dependency directories.
   */
  protected async getInputFiles(): Promise<string[]> {
    const patterns = this.config.patterns || ["src/**/*.ts", "runners/**/*.ts"];

    const allFiles: string[] = [];
    for (const pattern of patterns) {
      const resolvedPattern = resolve(this.config.workingDir, pattern);
      const normalizedPattern = normalizePath(resolvedPattern);
      const files = await glob(normalizedPattern, {
        ignore: [
          "**/node_modules/**",
          "**/.git/**",
          "**/dist/**",
          "**/.next/**",
          "**/.vercel/**",
          "**/.nitro/**",
        ],
        absolute: true,
      });
      allFiles.push(...files);
    }

    return [...new Set(allFiles)]; // Remove duplicates
  }

  /**
   * Caches discovered runner entries by input array reference.
   * Uses WeakMap to allow garbage collection when input arrays are no longer referenced.
   */
  private readonly discoveredEntries: WeakMap<
    string[],
    {
      discoveredRunners: string[];
    }
  > = new WeakMap();

  /**
   * Discovers runner files using esbuild plugin.
   * Caches results based on input files array reference.
   */
  protected async discoverEntries(
    inputs: string[],
    outdir: string
  ): Promise<{
    discoveredRunners: string[];
  }> {
    const previousResult = this.discoveredEntries.get(inputs);

    if (previousResult) {
      return previousResult;
    }

    const state: {
      discoveredRunners: string[];
    } = {
      discoveredRunners: [],
    };

    const discoverStart = Date.now();
    try {
      await build({
        treeShaking: true,
        entryPoints: inputs,
        plugins: [createDiscoverRunnersPlugin(state)],
        platform: "node",
        write: false,
        outdir,
        bundle: true,
        sourcemap: EMIT_SOURCEMAPS_FOR_DEBUGGING,
        absWorkingDir: this.config.workingDir,
        logLevel: "silent",
      });
    } catch (_) {
      // Ignore errors during discovery - they'll be caught during actual build
    }

    if (process.env.DEBUG || process.env.RUNNERS_DEBUG) {
      // eslint-disable-next-line no-console
      console.log(
        chalk.blue(
          `[runners/builders] Discovering runner directives: ${Date.now() - discoverStart}ms`
        )
      );
    }

    this.discoveredEntries.set(inputs, state);
    return state;
  }

  /**
   * Logs and optionally throws on esbuild errors and warnings.
   * @param throwOnError - If true, throws an error when esbuild errors are present
   */
  private logEsbuildMessages(
    result: {
      errors?: Array<{
        text: string;
        location?: { file: string; line: number; column: number } | null;
      }>;
      warnings?: Array<{
        text: string;
        location?: { file: string; line: number; column: number } | null;
      }>;
    },
    phase: string,
    throwOnError = true
  ): void {
    if (result.errors && result.errors.length > 0) {
      // eslint-disable-next-line no-console
      console.error(chalk.red(`❌ esbuild errors in ${phase}:`));
      const errorMessages: string[] = [];
      for (const error of result.errors) {
        // eslint-disable-next-line no-console
        console.error(chalk.red(`  ${error.text}`));
        errorMessages.push(error.text);
        if (error.location) {
          const location = `    at ${error.location.file}:${error.location.line}:${error.location.column}`;
          // eslint-disable-next-line no-console
          console.error(chalk.gray(location));
          errorMessages.push(location);
        }
      }

      if (throwOnError) {
        throw new Error(
          `Build failed during ${phase}:\n${errorMessages.join("\n")}`
        );
      }
    }

    if (result.warnings && result.warnings.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(chalk.yellow(`⚠️  esbuild warnings in ${phase}:`));
      for (const warning of result.warnings) {
        // eslint-disable-next-line no-console
        console.warn(chalk.yellow(`  ${warning.text}`));
        if (warning.location) {
          // eslint-disable-next-line no-console
          console.warn(
            chalk.gray(
              `    at ${warning.location.file}:${warning.location.line}:${warning.location.column}`
            )
          );
        }
      }
    }
  }

  /**
   * Creates a bundle containing all discovered runners.
   * Uses SWC transforms and production optimizations when applicable.
   */
  protected async createRunnersBundle({
    inputFiles,
    outfile,
    format = "esm",
    tsBaseUrl,
    tsPaths,
  }: {
    tsPaths?: Record<string, string[]>;
    tsBaseUrl?: string;
    inputFiles: string[];
    outfile: string;
    format?: "cjs" | "esm";
  }): Promise<void> {
    const { discoveredRunners: runnerFiles } = await this.discoverEntries(
      inputFiles,
      dirname(outfile)
    );

    // Write debug file
    await writeDebugFile(outfile, { runnerFiles });

    if (runnerFiles.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        chalk.yellow(
          `[runners/builders] No runners found matching patterns: ${this.config.patterns?.join(", ") || "default"}`
        )
      );
      // Create empty bundle
      const result = await build({
        stdin: {
          contents: "export const runners = {};",
          resolveDir: this.config.workingDir,
          sourcefile: "virtual-entry.js",
          loader: "js",
        },
        outfile,
        absWorkingDir: this.config.workingDir,
        bundle: true,
        format,
        platform: "node",
        write: true,
      });
      this.logEsbuildMessages(result, "empty bundle creation", false);
      return;
    }

    // Create virtual entry that imports all runner files
    // Use better path normalization for Windows compatibility
    const imports = runnerFiles
      .map((file, idx) => {
        // Normalize both paths to forward slashes before calling relative()
        // This is critical on Windows where relative() can produce unexpected results
        const normalizedWorkingDir = normalizePath(
          this.config.workingDir
        ).replace(TRAILING_SLASH_REGEX, "");
        const normalizedFile = normalizePath(file);

        // Calculate relative path from working directory to the file
        let relativePath = relative(
          normalizedWorkingDir,
          normalizedFile
        ).replace(PATH_SEPARATOR_REGEX, "/");

        // Ensure relative paths start with ./ so esbuild resolves them correctly
        if (!relativePath.startsWith(".")) {
          relativePath = `./${relativePath}`;
        }

        return `import * as runnerFile${idx} from '${relativePath}';`;
      })
      .join("\n");

    const entryContent = `
    ${imports}
    
    // Collect all runner exports
    const runners = {};
    ${runnerFiles
      .map(
        (_, idx) => `
    for (const [name, runner] of Object.entries(runnerFile${idx})) {
      if (typeof runner === 'function' && runner.constructor.name === 'AsyncFunction') {
        runners[name] = runner;
      }
    }`
      )
      .join("")}
    
    export { runners };
    `;

    const bundleStartTime = Date.now();
    const runnerManifest: RunnerManifest = {};

    // Get TypeScript config options if not provided
    if (!(tsPaths && tsBaseUrl)) {
      const tsConfig = await getTsConfigOptions(this.config.workingDir);
      tsPaths = tsPaths || tsConfig.paths;
      tsBaseUrl = tsBaseUrl || tsConfig.baseUrl;
    }

    // Get build options with production optimizations and externalization
    const buildOpts = getBuildOptions({
      tsPaths,
      tsBaseUrl,
      runnerManifest,
      entriesToBundle: runnerFiles, // Only bundle files with directives
      outdir: dirname(outfile),
    });

    // Bundle with esbuild and SWC transforms
    const result = await build({
      stdin: {
        contents: entryContent,
        resolveDir: this.config.workingDir,
        sourcefile: "virtual-entry.js",
        loader: "js",
      },
      outfile,
      absWorkingDir: this.config.workingDir,
      bundle: true,
      format,
      platform: "node",
      target: "es2022",
      write: true,
      treeShaking: true,
      keepNames: !buildOpts.minify, // Keep names unless minifying
      minify: buildOpts.minify,
      sourcemap: buildOpts.sourcemap,
      resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
      plugins: buildOpts.plugins,
      ...(tsPaths && tsBaseUrl
        ? {
            alias: Object.fromEntries(
              Object.entries(tsPaths).map(([key, paths]) => {
                const cleanKey = key.replace(ALIAS_KEY_REGEX, "");
                const cleanPath = paths[0]?.replace(ALIAS_PATH_REGEX, "") || "";
                return [cleanKey, resolve(tsBaseUrl, cleanPath)];
              })
            ),
          }
        : {}),
    });

    this.logEsbuildMessages(result, "runners bundle creation");

    const bundleTime = Date.now() - bundleStartTime;

    // Write manifest to debug file
    await writeDebugFile(
      join(dirname(outfile), "manifest"),
      { runners: runnerManifest.runners },
      true
    );

    // eslint-disable-next-line no-console
    console.log(
      chalk.green(
        `[runners/builders] Bundled ${runnerFiles.length} runner file(s) in ${bundleTime}ms`
      )
    );
  }

  /**
   * Creates a bundle context for watch mode with incremental rebuilds.
   */
  protected async createRunnersBundleContext({
    inputFiles,
    outfile,
    format = "esm",
    tsBaseUrl,
    tsPaths,
  }: {
    tsPaths?: Record<string, string[]>;
    tsBaseUrl?: string;
    inputFiles: string[];
    outfile: string;
    format?: "cjs" | "esm";
  }): Promise<void> {
    const { discoveredRunners: runnerFiles } = await this.discoverEntries(
      inputFiles,
      dirname(outfile)
    );

    // Write debug file
    await writeDebugFile(outfile, { runnerFiles });

    if (runnerFiles.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        chalk.yellow(
          `[runners/builders] No runners found matching patterns: ${this.config.patterns?.join(", ") || "default"}`
        )
      );
      // Create empty bundle context
      const ctx = await context({
        stdin: {
          contents: "export const runners = {};",
          resolveDir: this.config.workingDir,
          sourcefile: "virtual-entry.js",
          loader: "js",
        },
        outfile,
        absWorkingDir: this.config.workingDir,
        bundle: true,
        format,
        platform: "node",
        write: true,
      });
      this.buildContext = ctx;
      // Do initial build
      const result = await ctx.rebuild();
      this.logEsbuildMessages(result, "empty bundle creation", false);
      return;
    }

    // Create virtual entry that imports all runner files
    // Use better path normalization for Windows compatibility
    const imports = runnerFiles
      .map((file, idx) => {
        // Normalize both paths to forward slashes before calling relative()
        const normalizedWorkingDir = normalizePath(
          this.config.workingDir
        ).replace(TRAILING_SLASH_REGEX, "");
        const normalizedFile = normalizePath(file);

        // Calculate relative path from working directory to the file
        let relativePath = relative(
          normalizedWorkingDir,
          normalizedFile
        ).replace(PATH_SEPARATOR_REGEX, "/");

        // Ensure relative paths start with ./ so esbuild resolves them correctly
        if (!relativePath.startsWith(".")) {
          relativePath = `./${relativePath}`;
        }

        return `import * as runnerFile${idx} from '${relativePath}';`;
      })
      .join("\n");

    const entryContent = `
    ${imports}
    
    // Collect all runner exports
    const runners = {};
    ${runnerFiles
      .map(
        (_, idx) => `
    for (const [name, runner] of Object.entries(runnerFile${idx})) {
      if (typeof runner === 'function' && runner.constructor.name === 'AsyncFunction') {
        runners[name] = runner;
      }
    }`
      )
      .join("")}
    
    export { runners };
    `;

    const bundleStartTime = Date.now();
    const runnerManifest: RunnerManifest = {};

    // Get TypeScript config options if not provided
    if (!(tsPaths && tsBaseUrl)) {
      const tsConfig = await getTsConfigOptions(this.config.workingDir);
      tsPaths = tsPaths || tsConfig.paths;
      tsBaseUrl = tsBaseUrl || tsConfig.baseUrl;
    }

    // Get build options - watch mode is typically dev, so no minification
    const buildOpts = getBuildOptions({
      tsPaths,
      tsBaseUrl,
      runnerManifest,
      entriesToBundle: runnerFiles, // Only bundle files with directives
      outdir: dirname(outfile),
      minify: false, // Don't minify in watch mode
      sourcemap: EMIT_SOURCEMAPS_FOR_DEBUGGING ? "inline" : false,
    });

    // Create build context for watch mode
    const ctx = await context({
      stdin: {
        contents: entryContent,
        resolveDir: this.config.workingDir,
        sourcefile: "virtual-entry.js",
        loader: "js",
      },
      outfile,
      absWorkingDir: this.config.workingDir,
      bundle: true,
      format,
      platform: "node",
      target: "es2022",
      write: true,
      treeShaking: true,
      keepNames: true,
      minify: buildOpts.minify,
      sourcemap: buildOpts.sourcemap,
      resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
      plugins: buildOpts.plugins,
      ...(tsPaths && tsBaseUrl
        ? {
            alias: Object.fromEntries(
              Object.entries(tsPaths).map(([key, paths]) => {
                const cleanKey = key.replace(ALIAS_KEY_REGEX, "");
                const cleanPath = paths[0]?.replace(ALIAS_PATH_REGEX, "") || "";
                return [cleanKey, resolve(tsBaseUrl, cleanPath)];
              })
            ),
          }
        : {}),
    });
    this.buildContext = ctx;

    // Do initial build
    const result = await ctx.rebuild();
    this.logEsbuildMessages(result, "runners bundle creation");

    const bundleTime = Date.now() - bundleStartTime;

    // Write manifest to debug file
    await writeDebugFile(
      join(dirname(outfile), "manifest"),
      { runners: runnerManifest.runners },
      true
    );

    if (process.env.DEBUG || process.env.RUNNERS_DEBUG) {
      // eslint-disable-next-line no-console
      console.log(
        chalk.green(
          `[runners/builders] Bundled ${runnerFiles.length} runner file(s) in ${bundleTime}ms`
        )
      );
    }
  }
}
