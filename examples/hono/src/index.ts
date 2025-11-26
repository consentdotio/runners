import { Hono } from "hono";

const app = new Hono();

// Health check endpoint
app.get("/health", (c) =>
  c.json({
    status: "ok",
    message: "Runners API is available at /api/runner/execute",
    region: process.env.RUNNER_REGION || "us-east-1",
  })
);

export default app;
