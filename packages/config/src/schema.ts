import { z } from "zod";

export const runnersConfigSchema = z.object({
  url: z.string().url().optional(),
  region: z.string().optional(),
  runners: z.array(z.string()).min(1),
});

export type RunnersConfig = z.infer<typeof runnersConfigSchema>;
