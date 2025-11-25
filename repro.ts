
import { z } from 'zod';
import { oc } from '@orpc/contract';
import { OpenAPIGenerator } from '@orpc/openapi';
// Try importing v4 converter
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4';

const base = oc.$route({ inputStructure: "compact" });

const getRunStatus = base
  .route({
    method: "GET",
    path: "/orchestrator/{runId}/status",
    summary: "Get run status by runId",
    tags: ["Orchestrator"],
  })
  .input(
    z.object({
      runId: z.string().min(1),
    })
  )
  .output(z.object({ runId: z.string() }));

const orchestratorContract = {
  getStatus: getRunStatus,
};

async function main() {
  const converter = new ZodToJsonSchemaConverter();
  const inputSchema = z.object({
    runId: z.string().min(1),
  });
  
  console.log('Has _zod:', '_zod' in inputSchema);
  if ('_zod' in inputSchema) {
      const type = (inputSchema as any)._zod.def.type;
      console.log('_zod.def.type:', type);
      console.log('type === "object":', type === 'object');
      console.log('Def shape keys:', Object.keys((inputSchema as any)._zod.def.shape));
  } else {
      console.log('Standard Zod _def.typeName:', (inputSchema as any)._def?.typeName);
  }

  const [required, jsonSchema] = await converter.convert(inputSchema, { strategy: 'input' });
  console.log('JSON Schema:', JSON.stringify(jsonSchema, null, 2));

  const generator = new OpenAPIGenerator({
    schemaConverters: [converter],
  });

  try {
    const spec = await generator.generate(orchestratorContract, {
      info: {
        title: "Test",
        version: "1.0.0",
      },
    });
    console.log("Success");
  } catch (e) {
    console.error(e);
  }
}

main();

