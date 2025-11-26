/** biome-ignore-all lint/suspicious/useAwait: false positive */
/** biome-ignore-all lint/nursery/noUnusedExpressions: false positive */
export async function myRunner(_ctx) {
  const _x = 1;
  ("use runner");
  return { name: "test", status: "pass" };
}
