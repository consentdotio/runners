import type { RunnersConfig } from "./schema.js";
import { runnersConfigSchema } from "./schema.js";

export function defineConfig(config: RunnersConfig): RunnersConfig {
  return runnersConfigSchema.parse(config);
}

export type { RunnersConfig } from "./schema.js";
