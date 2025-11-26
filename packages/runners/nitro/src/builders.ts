import { mkdir } from "node:fs/promises";
import type { RunnerBuilderConfig } from "@runners/builders";
import { BaseBuilder } from "@runners/builders";
import type { Nitro } from "nitro/types";
import { join } from "pathe";

export class LocalBuilder extends BaseBuilder {
  readonly #outDir: string;

  constructor(nitro: Nitro, patterns?: string[]) {
    const outDir = join(nitro.options.buildDir, "runners");
    const config: RunnerBuilderConfig = {
      workingDir: nitro.options.rootDir,
      watch: nitro.options.dev,
      patterns: patterns || ["src/**/*.ts", "runners/**/*.ts"],
      outDir,
    };
    super(config);
    this.#outDir = outDir;
  }

  override async build(): Promise<void> {
    const inputFiles = await this.getInputFiles();
    await mkdir(this.#outDir, { recursive: true });

    await this.createRunnersBundle({
      inputFiles,
      outfile: join(this.#outDir, "runners.mjs"),
      format: "esm",
    });
  }
}
