/** biome-ignore-all lint/suspicious/useAwait: false positive */
export async function runner1(_ctx) {
  return { name: "test1", status: "pass" };
}

export async function runner2(_ctx) {
  return { name: "test2", status: "pass" };
}
