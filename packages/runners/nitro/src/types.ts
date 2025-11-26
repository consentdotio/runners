export type ModuleOptions = {
  /**
   * Pattern to scan for runner files.
   * @default ['src/**\/*.ts', 'runners/**\/*.ts']
   */
  pattern?: string | string[];

  /**
   * Region identifier for runners.
   * Can be overridden by RUNNER_REGION environment variable.
   */
  region?: string;
};

/**
 * Type helper to safely access Nitro options with runners configuration.
 *
 * Note: TypeScript cannot merge type aliases in module augmentation.
 * Since Nitro uses type aliases for its config options, we cannot properly
 * augment the types. This helper provides type-safe access to the runners
 * option while maintaining compatibility with Nitro's type system.
 */
export type NitroOptionsWithRunners = {
  runners?: ModuleOptions;
};

// Attempt to augment Nitro types for better IntelliSense
// This may not fully work due to TypeScript's type alias limitations,
// but provides documentation of the expected shape
declare module "nitro/types" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface NitroOptionsAugmentation extends NitroOptionsWithRunners {}
}
