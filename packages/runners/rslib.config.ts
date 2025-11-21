import { defineConfig } from "@rslib/core";

export default defineConfig({
  source: {
    entry: {
      index: "./src/index.ts",
      cli: "./src/cli.ts",
      config: "./src/config.ts",
      nitro: "./src/nitro.ts",
      errors: "./src/errors.ts",
      http: "./src/http.ts",
    },
  },
  lib: [
    {
      bundle: true,
      dts: true,
      format: "esm",
    },
  ],
  output: {
    target: "node",
    cleanDistPath: true,
    filename: {
      js: "[name].mjs",
    },
  },
});
