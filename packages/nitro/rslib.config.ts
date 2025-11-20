import { defineConfig } from "@rslib/core";

export default defineConfig({
  source: {
    entry: {
      index: "./src/index.ts",
    },
  },
  lib: [
    {
      bundle: true,
      dts: false, // Disable DTS generation - nitro types are peer dependency
      format: "esm",
    },
  ],
  output: {
    target: "node",
    cleanDistPath: true,
    filename: {
      js: "[name].js",
    },
  },
});
