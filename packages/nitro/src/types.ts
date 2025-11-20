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

declare module "nitro/types" {
  //@ts-expect-error - NitroOptions is not defined in nitro/types
  type NitroOptions = {
    runners?: ModuleOptions;
  };
}

// @ts-expect-error (legacy)
declare module "nitropack" {
  type NitroOptions = {
    runners?: ModuleOptions;
  };
}
