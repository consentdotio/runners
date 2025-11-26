/** biome-ignore-all lint/suspicious/useAwait: false positive */
export async function myRunner(_ctx) {
  return { name: "test", status: "pass" };
}
