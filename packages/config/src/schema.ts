import { z } from "zod";

export const runnersConfigSchema = z.object({
  url: z.string().url(),
  region: z.string().optional(),
  tests: z.array(z.string()).min(1),
});

export type RunnersConfig = z.infer<typeof runnersConfigSchema>;
