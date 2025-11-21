import type { Runner } from "runners";

export const testFromRunnersDir: Runner = async (ctx) => {
  "use runner";
  const { page, log } = ctx;
  log("Test from runners/ directory");
  return { name: "test_from_runners_dir", status: "pass", details: {} };
};
