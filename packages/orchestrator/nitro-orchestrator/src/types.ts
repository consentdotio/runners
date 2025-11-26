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

declare module "nitro/types" {
  //@ts-expect-error - NitroOptions is not defined in nitro/types
  type NitroOptions = {
    orchestrator?: OrchestratorModuleOptions;
  };
}

// @ts-expect-error (legacy)
declare module "nitropack" {
  type NitroOptions = {
    orchestrator?: OrchestratorModuleOptions;
  };
}
