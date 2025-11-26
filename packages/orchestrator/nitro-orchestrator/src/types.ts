export type OrchestratorModuleOptions = {
  /**
   * Pattern to scan for runner files when discovering runners.
   * @default ['src/**\/*.ts', 'runners/**\/*.ts']
   */
  pattern?: string | string[];

  /**
   * Map of region names to remote runner endpoint URLs.
   * Used for remote mode execution.
   *
   * @example
   * {
   *   "us-east-1": "https://us-east.runner.example.com/api/runner",
   *   "eu-west-1": "https://eu-west.runner.example.com/api/runner"
   * }
   */
  runners?: Record<string, string>;
};

/**
 * Type helper to safely access Nitro options with orchestrator configuration.
 *
 * Note: TypeScript cannot merge type aliases in module augmentation.
 * Since Nitro uses type aliases for its config options, we cannot properly
 * augment the types. This helper provides type-safe access to the orchestrator
 * option while maintaining compatibility with Nitro's type system.
 */
export type NitroOptionsWithOrchestrator = {
  orchestrator?: OrchestratorModuleOptions;
};

// Attempt to augment Nitro types for better IntelliSense
// This may not fully work due to TypeScript's type alias limitations,
// but provides documentation of the expected shape
declare module "nitro/types" {
  interface NitroOptionsAugmentation extends NitroOptionsWithOrchestrator {}
}
