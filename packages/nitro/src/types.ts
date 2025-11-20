export type ModuleOptions = {
  /**
   * Pattern to scan for test files.
   * @default 'src/**\/*.ts'
   */
  pattern?: string;

  /**
   * Region identifier for tests.
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
