export async function myRunner(ctx) {
  const x = 1;
  "use runner";
  return { name: "test", status: "pass" };
}

