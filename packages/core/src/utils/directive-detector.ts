import * as fs from "node:fs";
import * as ts from "typescript";
import type { FunctionLikeDeclaration, SourceFile, Node } from "typescript";

export interface DirectiveDetectionResult {
  hasModuleDirective: boolean;
  functionDirectives: Map<string, boolean>;
  defaultExportHasDirective: boolean;
}

/**
 * Checks if a function has a "use runner" directive
 */
function getFunctionDirective(node: FunctionLikeDeclaration): boolean {
  if (!node.body || !ts.isBlock(node.body)) {
    return false;
  }

  const firstStatement = node.body.statements[0];
  if (!firstStatement || !ts.isExpressionStatement(firstStatement)) {
    return false;
  }

  const expression = firstStatement.expression;
  if (!ts.isStringLiteral(expression)) {
    return false;
  }

  return expression.text === "use runner";
}

/**
 * Checks if the source file has a module-level "use runner" directive
 */
function hasModuleDirective(sourceFile: SourceFile): boolean {
  const firstStatement = sourceFile.statements[0];
  if (!firstStatement || !ts.isExpressionStatement(firstStatement)) {
    return false;
  }

  const expression = firstStatement.expression;
  if (!ts.isStringLiteral(expression)) {
    return false;
  }

  return expression.text === "use runner";
}

/**
 * Gets the export name for a function declaration or variable declaration
 */
function getExportName(
  node: Node
): { name: string; isDefault: boolean } | null {
  // Function declaration: export async function myTest() {}
  if (ts.isFunctionDeclaration(node)) {
    if (node.name) {
      const isDefault =
        node.modifiers?.some(
          (mod) => mod.kind === ts.SyntaxKind.DefaultKeyword
        ) ?? false;
      return { name: node.name.text, isDefault };
    }
  }

  // Variable declaration: export const myTest = async () => {}
  if (ts.isVariableDeclaration(node)) {
    if (ts.isIdentifier(node.name)) {
      // Check if parent variable statement is exported
      const variableStatement = node.parent?.parent;
      if (variableStatement && ts.isVariableStatement(variableStatement)) {
        const isDefault =
          variableStatement.modifiers?.some(
            (mod) => mod.kind === ts.SyntaxKind.DefaultKeyword
          ) ?? false;
        const isExported =
          variableStatement.modifiers?.some(
            (mod) => mod.kind === ts.SyntaxKind.ExportKeyword
          ) ?? false;
        if (isExported || isDefault) {
          return { name: node.name.text, isDefault };
        }
      }
    }
  }

  return null;
}

/**
 * Detects "use runner" directives in a TypeScript source file
 * Returns information about module-level and function-level directives
 */
export function detectDirectives(filePath: string): DirectiveDetectionResult {
  const sourceCode = fs.readFileSync(filePath, "utf-8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );

  const result: DirectiveDetectionResult = {
    hasModuleDirective: hasModuleDirective(sourceFile),
    functionDirectives: new Map<string, boolean>(),
    defaultExportHasDirective: false,
  };

  // Traverse AST to find exported functions and check for directives
  function visit(node: Node) {
    // Check function declarations
    if (ts.isFunctionDeclaration(node)) {
      const exportInfo = getExportName(node);
      if (exportInfo) {
        const hasDirective = getFunctionDirective(node);
        if (exportInfo.isDefault) {
          result.defaultExportHasDirective = hasDirective;
        } else {
          result.functionDirectives.set(exportInfo.name, hasDirective);
        }
      }
    }

    // Check variable declarations (for arrow functions and function expressions)
    if (ts.isVariableDeclaration(node)) {
      const init = node.initializer;
      if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
        const exportInfo = getExportName(node);
        if (exportInfo) {
          const hasDirective = getFunctionDirective(init);
          if (exportInfo.isDefault) {
            result.defaultExportHasDirective = hasDirective;
          } else {
            result.functionDirectives.set(exportInfo.name, hasDirective);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return result;
}
