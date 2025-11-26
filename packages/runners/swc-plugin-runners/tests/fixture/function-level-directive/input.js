/** biome-ignore-all lint/suspicious/useAwait: false positive */
export async function myRunner(_ctx) {
  "use runner";
  return { name: "test", status: "pass" };
}
