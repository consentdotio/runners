import { Hono } from "hono";
import { createOrchestratorHandler } from "runners/orchestrator";

const app = new Hono();

// Create orchestrator handler
const orchestratorHandler = createOrchestratorHandler();

// Health check endpoint
app.get("/health", (c) =>
  c.json({
    status: "ok",
    message: "Orchestrator API is available at /api",
    docs: "/docs",
  })
);

// Mount orchestrator API handler on all routes (including /docs, /api/docs, /api/*)
app.all("*", async (c) => {
  const response = await orchestratorHandler(c.req.raw);

  // If handler returns a response, use it; otherwise return 404
  if (response) {
    return response;
  }

  return c.text("Not found", 404);
});

export default app;
