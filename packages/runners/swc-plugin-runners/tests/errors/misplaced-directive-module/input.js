/** biome-ignore-all lint/suspicious/useAwait: false positive */
"use runner";

export async function myRunner(_ctx) {
  return { name: "test", status: "pass" };
}
