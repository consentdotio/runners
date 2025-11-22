"use runner";

export async function runner1(ctx) {
  return { name: "test1", status: "pass" };
}

export async function runner2(ctx) {
  return { name: "test2", status: "pass" };
}

