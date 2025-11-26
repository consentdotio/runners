import { defineConfig } from "nitro";

export default defineConfig({
  modules: ["runners/nitro-orchestrator"],
  orchestrator: {
    // Configure remote runner endpoints for remote mode
    runners: {
      "us-east-1": "http://localhost:3001/api/runner",
      // Add more regions as needed
    },
  },
  // Externalize orchestrator package to prevent bundling
  externals: {
    external: ["@runners/orchestrator"],
  },
});
