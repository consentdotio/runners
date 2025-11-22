#!/usr/bin/env node

/**
 * Example HTTP server using the runners HTTP handler
 * 
 * This demonstrates how to expose a runner as an HTTP endpoint
 * for use by an orchestrator or workflow engine.
 */

import { createOrpcRunnerHandler } from 'runners/http';
import { discoverRunners } from 'runners';

const PORT = process.env.PORT || 3000;
const REGION = process.env.RUNNER_REGION || 'us-east-1';

// Discover runners - only functions with "use runner" directive are discovered by default
const runnersMap = await discoverRunners('src/runners/**/*.ts');
const runners = Object.fromEntries(runnersMap);

// Create the HTTP handler
const handler = createOrpcRunnerHandler({
  runners,
  region: REGION,
});

// Simple HTTP server (using Node.js built-in)
import { createServer } from 'node:http';

const server = createServer(async (req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Read request body
  const body = await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });

  // Convert Node.js request to Web API Request
  // Node.js 18+ has native fetch/Request support
  const url = `http://${req.headers.host}${req.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      headers.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((v) => headers.append(key, v));
    }
  }

  let webRequest;
  try {
    webRequest = new Request(url, {
      method: req.method,
      headers,
      body: body && Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    console.error('Request creation error:', error);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid request', details: error.message }));
    return;
  }

  try {
    const response = await handler(webRequest);
    const responseBody = await response.text();

    // Convert Web API Response to Node.js response
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    res.writeHead(response.status, {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      ...responseHeaders,
    });
    res.end(responseBody);
  } catch (error) {
    console.error('Handler error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error', details: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`Runners HTTP API server running on http://localhost:${PORT}`);
  console.log(`Region: ${REGION}`);
  console.log(`Available runners: ${Object.keys(runners).join(', ')}`);
  console.log('\nExample request:');
  console.log(`curl -X POST http://localhost:${PORT} \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"url": "https://example.com", "runners": ["exampleTitleVisibleTest"]}'`);
});

