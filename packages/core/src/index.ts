export { runTests } from "./runner.js";
export {
  type RunnerTest,
  type RunnerTestContext,
  type RunnerTestResult,
  type RunTestsOptions,
  type RunTestsResult,
  type TestStatus,
} from "./types.js";

// Re-export config
export { defineConfig, type RunnersConfig } from "./config.js";

// Export test discovery utilities
export { discoverTests } from "./utils/discover.js";
export {
  detectDirectives,
  type DirectiveDetectionResult,
} from "./utils/directive-detector.js";
