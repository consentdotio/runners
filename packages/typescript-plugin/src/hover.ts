import type { Program, QuickInfo } from 'typescript/lib/tsserverlibrary';
import { getDirective } from './utils';

type TypeScriptLib = typeof import('typescript/lib/tsserverlibrary');
type StringLiteral = import('typescript/lib/tsserverlibrary').StringLiteral;

export function getHoverInfo(
  fileName: string,
  position: number,
  program: Program,
  ts: TypeScriptLib
): QuickInfo | undefined {
  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) {
    return;
  }

  // Find the node at the hover position
  let directiveNode: StringLiteral | null = null;

  function visit(currentNode: import('typescript/lib/tsserverlibrary').Node) {
    if (
      ts.isStringLiteral(currentNode) &&
      position >= currentNode.getStart(sourceFile) &&
      position < currentNode.getEnd()
    ) {
      directiveNode = currentNode;
      return;
    }
    ts.forEachChild(currentNode, visit);
  }

  visit(sourceFile);

  if (!directiveNode) {
    return;
  }

  // TypeScript needs help here - we've already checked for null
  const node: StringLiteral = directiveNode;
  const text = node.text;

  // Check if this is a directive
  if (text !== 'use runner') {
    return;
  }

  // Check if this string is the first statement in a function body
  const parent = node.parent;
  if (!parent) {
    return;
  }
  if (!ts.isExpressionStatement(parent)) {
    return;
  }

  const grandParent = parent.parent;
  if (!grandParent) {
    return;
  }
  if (!ts.isBlock(grandParent)) {
    return;
  }

  const blockParent = grandParent.parent;
  if (!blockParent) {
    return;
  }
  const isFunctionLike =
    ts.isFunctionDeclaration(blockParent) ||
    ts.isArrowFunction(blockParent) ||
    ts.isFunctionExpression(blockParent);
  if (!isFunctionLike) {
    return;
  }

  // Make sure this is the first statement
  if (grandParent.statements[0] !== parent) {
    return;
  }

  // Get the parent function to determine directive type
  const directive = getDirective(blockParent, sourceFile, ts);
  if (!directive) {
    return;
  }

  return {
    kind: ts.ScriptElementKind.constElement,
    kindModifiers: '',
    textSpan: {
      start: node.getStart(sourceFile),
      length: node.getWidth(sourceFile),
    },
    displayParts: [
      {
        text: 'Runners SDK - Runner Function',
        kind: 'text',
      },
    ],
    documentation: [
      {
        text: 'The `"use runner"` directive marks this function as a runner that will be discovered and executed by the Runners SDK. Runner functions must be async and receive a `RunnerContext` parameter.',
        kind: 'text',
      },
    ],
  };
}
