import {
  getDirective,
  getDirectiveTypo,
  isAsyncFunction,
} from './utils';

type TypeScriptLib = typeof import('typescript/lib/tsserverlibrary');
type Program = import('typescript/lib/tsserverlibrary').Program;
type Diagnostic = import('typescript/lib/tsserverlibrary').Diagnostic;
type Node = import('typescript/lib/tsserverlibrary').Node;
type FunctionLikeDeclaration =
  import('typescript/lib/tsserverlibrary').FunctionLikeDeclaration;

export function getCustomDiagnostics(
  fileName: string,
  program: Program,
  ts: TypeScriptLib
): Diagnostic[] {
  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) {
    return [];
  }

  const diagnostics: Diagnostic[] = [];
  const typeChecker = program.getTypeChecker();

  function addTypoError(node: Node, typo: string, expected: string) {
    const formattedTypo = `'${typo}'`;
    const formattedCorrect = `'${expected}'`;

    diagnostics.push({
      file: sourceFile,
      start: node.getStart(sourceFile),
      length: node.getWidth(sourceFile),
      messageText: `${formattedTypo} looks like a typo. Did you mean ${formattedCorrect}?`,
      category: ts.DiagnosticCategory.Error,
      code: 9008,
    });
  }

  function checkDirectiveStringLiteral(node: Node) {
    if (!ts.isStringLiteral(node)) {
      return;
    }

    const parent = node.parent;
    if (
      !parent ||
      !ts.isExpressionStatement(parent) ||
      !parent.parent ||
      !ts.isBlock(parent.parent)
    ) {
      return;
    }

    const block = parent.parent;
    const blockParent = block.parent;

    // Check if this is the first statement in a function body
    const isFunctionBody =
      (ts.isFunctionDeclaration(blockParent) ||
        ts.isArrowFunction(blockParent) ||
        ts.isFunctionExpression(blockParent)) &&
      block.statements[0] === parent;

    if (!isFunctionBody) {
      return;
    }

    const directiveTypo = getDirectiveTypo(node.text);
    if (directiveTypo) {
      addTypoError(node, node.text, directiveTypo);
    }
  }

  function visit(node: Node) {
    // Check for misspelled directives in string literals at the start of functions
    checkDirectiveStringLiteral(node);

    // Check function declarations for runner directives
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node)
    ) {
      if (sourceFile) {
        const directive = getDirective(node, sourceFile, ts);

        if (directive === 'use runner') {
          checkRunnerFunction(node);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  function checkRunnerFunction(node: FunctionLikeDeclaration) {
    // Ensure it's async
    if (!isAsyncFunction(node, typeChecker, ts)) {
      const start = node.getStart(sourceFile);
      const length = node.getWidth(sourceFile);
      diagnostics.push({
        file: sourceFile,
        start,
        length,
        messageText: 'Runner functions must be async or return a Promise',
        category: ts.DiagnosticCategory.Error,
        code: 9001,
      });
    }
  }

  visit(sourceFile);
  return diagnostics;
}

