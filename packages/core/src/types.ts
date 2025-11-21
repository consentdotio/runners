import type { StandardSchemaV1 } from "@standard-schema/spec";

export type RunStatus = "pass" | "fail" | "error";

export type RunnerResult<TDetails = Record<string, unknown>> = {
  name: string;
  status: RunStatus;
  details?: TDetails;
  errorMessage?: string;
  durationMs?: number;
};

export type RunnerContext = {
  page: import("playwright").Page;
  url: string;
  region?: string;
  runId?: string;
  log: (message: string, meta?: Record<string, unknown>) => void;
};

// Helper to extract the result type from a Runner function
type RunnerResultType<TRunner extends Runner> = TRunner extends (
  ctx: RunnerContext,
  input?: unknown
) => Promise<infer TResult>
  ? TResult
  : never;

// Helper to extract result types from a tuple of runners
type ExtractRunnerResults<TRunners extends readonly Runner[]> = {
  [K in keyof TRunners]: RunnerResultType<TRunners[K]>;
};

export type RunRunnersOptions<TRunners extends readonly Runner[] = Runner[]> = {
  url: string;
  runners: TRunners;
  region?: string;
  runId?: string;
  timeout?: number;
};

export type RunRunnersResult<TRunners extends readonly Runner[] = Runner[]> = {
  url: string;
  region?: string;
  runId?: string;
  results: ExtractRunnerResults<TRunners>;
};

// Re-export Standard Schema types for convenience
export type { StandardSchemaV1 } from "@standard-schema/spec";

// Generic Runner type that works with Zod schemas or Standard Schema
export type Runner<
  TInput extends
    | StandardSchemaV1<unknown, unknown>
    | import("zod").ZodTypeAny = StandardSchemaV1<unknown, unknown>,
  TOutput extends
    | StandardSchemaV1<unknown, unknown>
    | import("zod").ZodTypeAny = StandardSchemaV1<unknown, unknown>,
> = TInput extends import("zod").ZodTypeAny
  ? TOutput extends import("zod").ZodTypeAny
    ? (
        ctx: RunnerContext,
        input?: import("zod").infer<TInput>
      ) => Promise<RunnerResult<import("zod").infer<TOutput>>>
    : TOutput extends StandardSchemaV1<unknown, infer TOut>
      ? (
          ctx: RunnerContext,
          input?: import("zod").infer<TInput>
        ) => Promise<RunnerResult<TOut>>
      : never
  : TInput extends StandardSchemaV1<infer TIn, unknown>
    ? TOutput extends import("zod").ZodTypeAny
      ? (
          ctx: RunnerContext,
          input?: TIn
        ) => Promise<RunnerResult<import("zod").infer<TOutput>>>
      : TOutput extends StandardSchemaV1<unknown, infer TOut>
        ? (ctx: RunnerContext, input?: TIn) => Promise<RunnerResult<TOut>>
        : never
    : never;

// Helper function to validate using Standard Schema
// This accepts any Standard Schema-compliant validator
export async function validateStandardSchema<
  T extends StandardSchemaV1<unknown, unknown>,
>(schema: T, value: unknown): Promise<StandardSchemaV1.InferOutput<T>> {
  let result = schema["~standard"].validate(value);
  if (result instanceof Promise) {
    result = await result;
  }

  // If the `issues` field exists, the validation failed
  if ("issues" in result && result.issues) {
    const messages = result.issues.map((issue) => issue.message).join(", ");
    throw new Error(`Validation failed: ${messages}`);
  }

  // TypeScript should narrow to { value: Output } here
  if ("value" in result) {
    return result.value;
  }

  // Fallback (should never happen, but TypeScript needs it)
  throw new Error("Validation failed: unknown error");
}
