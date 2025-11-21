#!/usr/bin/env node
/**
 * Test script to verify the TypeScript plugin is working
 * This simulates what an IDE would do when loading the plugin
 */

// biome-ignore lint/performance/noNamespaceImport: TypeScript API requires namespace import for test file
import * as ts from 'typescript';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

// Load the plugin
const pluginPath = join(__dirname, 'dist', 'index.js');
if (!existsSync(pluginPath)) {
  console.error(`❌ Plugin not found at ${pluginPath}`);
  console.error('   Run "pnpm build" first');
  process.exit(1);
}

const plugin = require(pluginPath);

// Create a test file with intentional errors
const testFile = `
export const myRunner = async (ctx) => {
  "use runer"; // Typo: should be "use runner"
  return { name: "test", status: "pass" };
};

export const badRunner = (ctx) => {
  "use runner"; // Error: not async
  return { name: "test", status: "pass" };
};
`;

const testFileName = 'test-runner.ts';

// Create a TypeScript program
const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  strict: false,
  skipLibCheck: true,
};


// Initialize the plugin
const pluginInit = plugin.init({ typescript: ts });
const languageServiceHost: ts.LanguageServiceHost = {
  getCompilationSettings: () => compilerOptions,
  getScriptFileNames: () => [testFileName],
  getScriptVersion: () => '1',
  getScriptSnapshot: (fileName) => {
    if (fileName === testFileName) {
      return ts.ScriptSnapshot.fromString(testFile);
    }
  },
  getCurrentDirectory: () => process.cwd(),
  getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
  fileExists: (fileName) => fileName === testFileName,
  readFile: (fileName) => (fileName === testFileName ? testFile : undefined),
  readDirectory: () => [],
};

const languageService = ts.createLanguageService(languageServiceHost);

// Create a minimal mock project for the plugin
// We only need the logger, so we use a type assertion for the partial mock
const mockProject = {
  projectService: {
    logger: {
      info: (msg: string) => console.log(`[Plugin] ${msg}`),
      log: (msg: string) => console.log(`[Plugin] ${msg}`),
      err: (msg: string) => console.error(`[Plugin Error] ${msg}`),
      warn: (msg: string) => console.warn(`[Plugin Warn] ${msg}`),
    },
  },
} as unknown as ts.server.Project;

const pluginCreateInfo: ts.server.PluginCreateInfo = {
  project: mockProject,
  config: {},
  languageService,
} as ts.server.PluginCreateInfo;

const enhancedLanguageService = pluginInit.create(pluginCreateInfo);

// Get diagnostics
console.log('\n🔍 Checking for plugin diagnostics...\n');
const diagnostics = enhancedLanguageService.getSemanticDiagnostics(testFileName);

if (diagnostics.length === 0) {
  console.log('❌ No diagnostics found. Plugin may not be working.');
  process.exit(1);
}

console.log(`✅ Found ${diagnostics.length} diagnostic(s):\n`);

for (const diagnostic of diagnostics) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  const file = diagnostic.file;
  if (file) {
    const { line, character } = file.getLineAndCharacterOfPosition(
      diagnostic.start || 0
    );
    console.log(
      `  [${line + 1}:${character + 1}] Error ${diagnostic.code}: ${message}`
    );
  } else {
    console.log(`  Error ${diagnostic.code}: ${message}`);
  }
}

// Check for expected errors
const hasTypoError = diagnostics.some((d) => d.code === 9008);
const hasAsyncError = diagnostics.some((d) => d.code === 9001);

console.log('\n📊 Results:');
console.log(`  Typo detection (9008): ${hasTypoError ? '✅' : '❌'}`);
console.log(`  Async validation (9001): ${hasAsyncError ? '✅' : '❌'}`);

if (hasTypoError && hasAsyncError) {
  console.log('\n✅ Plugin is working correctly!');
  process.exit(0);
} else {
  console.log('\n❌ Plugin may not be working as expected');
  process.exit(1);
}

