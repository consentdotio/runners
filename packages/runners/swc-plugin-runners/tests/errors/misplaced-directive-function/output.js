/** biome-ignore-all lint/suspicious/useAwait: false positive */
export async function myRunner(_ctx) {
  const _x = 1;
  return { name: "test", status: "pass" };
}
