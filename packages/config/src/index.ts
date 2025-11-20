import type { RunnersConfig } from "./schema";
import { runnersConfigSchema } from "./schema";

export function defineConfig(config: RunnersConfig): RunnersConfig {
  return runnersConfigSchema.parse(config);
}

export type { RunnersConfig } from "./schema";
