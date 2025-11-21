import type { Runner } from "@runners/core";
import { discoverRunners } from "@runners/core";

export async function loadRunners(
  runnerNames?: string[],
  requireDirective: boolean = true
): Promise<Runner[]> {
  const allRunners = await discoverRunners(undefined, requireDirective);

  if (!runnerNames || runnerNames.length === 0) {
    return Array.from(allRunners.values());
  }

  const selectedRunners: Runner[] = [];

  for (const name of runnerNames) {
    const runner = allRunners.get(name);
    if (!runner) {
      throw new Error(
        `Runner "${name}" not found. Available runners: ${Array.from(allRunners.keys()).join(", ")}`
      );
    }
    selectedRunners.push(runner);
  }

  return selectedRunners;
}
