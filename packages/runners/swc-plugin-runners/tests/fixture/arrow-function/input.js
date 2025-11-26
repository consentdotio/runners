/** biome-ignore-all lint/suspicious/useAwait: false positive */
export const myRunner = async (_ctx) => {
  "use runner";
  return { name: "test", status: "pass" };
};
