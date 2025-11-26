/** biome-ignore-all lint/suspicious/useAwait: false positive */
export async function myRunner(_ctx) {
  "use runer";
  return { name: "test", status: "pass" };
}
