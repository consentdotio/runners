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
// packages/core/src/types.ts

// Minimal schema interface that works with multiple libraries
export interface SchemaLike<TInput = unknown, TOutput = TInput> {
  parse?: (input: unknown) => TOutput;
  validate?: (input: unknown) => { success: boolean; data?: TOutput; error?: any };
  safeParse?: (input: unknown) => { success: boolean; data?: TOutput; error?: any };
  _type?: TOutput; // For type inference
  _input?: TInput;
}

// Helper to extract type from Zod schema (using z.infer) or SchemaLike
type InferType<TSchema> =
  TSchema extends import('zod').ZodTypeAny
    ? import('zod').infer<TSchema>
    : TSchema extends SchemaLike<any, infer T>
    ? T
    : TSchema extends { _type: infer T }
    ? T
    : unknown;

// Generic Runner type that works with Zod schemas or SchemaLike objects
// Direct conditional check for Zod schemas
export type Runner<
  TInput extends SchemaLike<any, any> | import('zod').ZodTypeAny = SchemaLike<any, any>,
  TOutput extends SchemaLike<any, any> | import('zod').ZodTypeAny = SchemaLike<any, any>,
> = TInput extends import('zod').ZodTypeAny
  ? TOutput extends import('zod').ZodTypeAny
    ? (
        ctx: RunnerContext,
        input?: import('zod').infer<TInput>
      ) => Promise<RunnerResult<import('zod').infer<TOutput>>>
    : (
        ctx: RunnerContext,
        input?: import('zod').infer<TInput>
      ) => Promise<RunnerResult<InferType<TOutput>>>
  : TOutput extends import('zod').ZodTypeAny
  ? (
      ctx: RunnerContext,
      input?: InferType<TInput>
    ) => Promise<RunnerResult<import('zod').infer<TOutput>>>
  : (
      ctx: RunnerContext,
      input?: InferType<TInput>
    ) => Promise<RunnerResult<InferType<TOutput>>>;

// Helper to extract types
export type InferSchemaType<TSchema extends SchemaLike<any, any>> =
  TSchema extends SchemaLike<any, infer T> ? T : unknown;