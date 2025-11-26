import ts from "typescript/lib/tsserverlibrary";

export function createTestProgram(
  source: string,
  fileName = "test.ts"
): {
  program: ts.Program;
  sourceFile: ts.SourceFile;
} {
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    strict: false,
    skipLibCheck: true,
  };

  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.ES2022,
    true
  );

  const host: ts.CompilerHost = {
    getSourceFile: (name) => {
      if (name === fileName) {
        return sourceFile;
      }
      return;
    },
    writeFile: () => {
      throw new Error("writeFile not implemented");
    },
    getCurrentDirectory: () => "",
    getDirectories: () => [],
    fileExists: () => true,
    readFile: () => "",
    getCanonicalFileName: (name) => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
    getDefaultLibFileName: () => "lib.d.ts",
  };

  const program = ts.createProgram([fileName], compilerOptions, host);

  return { program, sourceFile };
}

export function expectDiagnostic(
  diagnostics: ts.Diagnostic[],
  options: {
    code?: number;
    messageIncludes?: string;
  }
): void {
  const matching = diagnostics.filter((d) => {
    if (options.code !== undefined && d.code !== options.code) {
      return false;
    }
    if (
      options.messageIncludes &&
      !d.messageText.toString().includes(options.messageIncludes)
    ) {
      return false;
    }
    return true;
  });

  if (matching.length === 0) {
    const messages = diagnostics.map((d) => ({
      code: d.code,
      message: d.messageText.toString(),
    }));
    throw new Error(
      `Expected diagnostic not found. Options: ${JSON.stringify(options)}. Found diagnostics: ${JSON.stringify(messages)}`
    );
  }
}

export function expectNoDiagnostic(
  diagnostics: ts.Diagnostic[],
  code: number
): void {
  const matching = diagnostics.filter((d) => d.code === code);
  if (matching.length > 0) {
    const messages = matching.map((d) => d.messageText.toString());
    throw new Error(
      `Unexpected diagnostic found with code ${code}. Messages: ${JSON.stringify(messages)}`
    );
  }
}
