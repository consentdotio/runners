import { something } from "./other";

"use runner";

export async function myRunner(ctx) {
  return { name: "test", status: "pass" };
}

