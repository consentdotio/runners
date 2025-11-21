import { describe, expect, it } from 'vitest';
import ts from 'typescript/lib/tsserverlibrary';
import { getDirective, isAsyncFunction } from './utils';
import { createTestProgram } from './test-helpers';

describe('getDirective', () => {
  it('returns "use runner" for runner functions', () => {
    const source = `
      function myRunner() {
        'use runner';
        return 123;
      }
    `;

    const { program, sourceFile } = createTestProgram(source);

    let result: string | null = null;
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isFunctionDeclaration(node)) {
        result = getDirective(node, sourceFile, ts);
      }
    });

    expect(result).toBe('use runner');
  });

  it('returns null for functions without directives', () => {
    const source = `
      function normalFunction() {
        return 123;
      }
    `;

    const { program, sourceFile } = createTestProgram(source);

    let result: string | null = null;
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isFunctionDeclaration(node)) {
        result = getDirective(node, sourceFile, ts);
      }
    });

    expect(result).toBeNull();
  });

  it('returns null for functions with other string literals', () => {
    const source = `
      function myFunction() {
        'use strict';
        return 123;
      }
    `;

    const { program, sourceFile } = createTestProgram(source);

    let result: string | null = null;
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isFunctionDeclaration(node)) {
        result = getDirective(node, sourceFile, ts);
      }
    });

    expect(result).toBeNull();
  });

  it('handles arrow functions', () => {
    const source = `
      const myRunner = () => {
        'use runner';
        return 123;
      };
    `;

    const { program, sourceFile } = createTestProgram(source);

    let result: string | null = null;
    function visit(node: ts.Node) {
      if (ts.isArrowFunction(node)) {
        result = getDirective(node, sourceFile, ts);
      }
      ts.forEachChild(node, visit);
    }
    ts.forEachChild(sourceFile, visit);

    expect(result).toBe('use runner');
  });

  it('handles double quotes', () => {
    const source = `
      function myRunner() {
        "use runner";
        return 123;
      }
    `;

    const { program, sourceFile } = createTestProgram(source);

    let result: string | null = null;
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isFunctionDeclaration(node)) {
        result = getDirective(node, sourceFile, ts);
      }
    });

    expect(result).toBe('use runner');
  });
});

describe('isAsyncFunction', () => {
  it('returns true for async functions', () => {
    const source = `
      async function myFunction() {
        return 123;
      }
    `;

    const { program, sourceFile } = createTestProgram(source);
    const typeChecker = program.getTypeChecker();

    let result: boolean | null = null;
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isFunctionDeclaration(node)) {
        result = isAsyncFunction(node, typeChecker, ts);
      }
    });

    expect(result).toBe(true);
  });

  it('returns true for functions returning Promise', () => {
    const source = `
      function myFunction(): Promise<number> {
        return Promise.resolve(123);
      }
    `;

    const { program, sourceFile } = createTestProgram(source);
    const typeChecker = program.getTypeChecker();

    let result: boolean | null = null;
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isFunctionDeclaration(node)) {
        result = isAsyncFunction(node, typeChecker, ts);
      }
    });

    expect(result).toBe(true);
  });

  it('returns false for non-async functions without Promise', () => {
    const source = `
      function myFunction() {
        return 123;
      }
    `;

    const { program, sourceFile } = createTestProgram(source);
    const typeChecker = program.getTypeChecker();

    let result: boolean | null = null;
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isFunctionDeclaration(node)) {
        result = isAsyncFunction(node, typeChecker, ts);
      }
    });

    expect(result).toBe(false);
  });

  it('handles async arrow functions', () => {
    const source = `
      const myFunction = async () => {
        return 123;
      };
    `;

    const { program, sourceFile } = createTestProgram(source);
    const typeChecker = program.getTypeChecker();

    let result: boolean | null = null;
    function visit(node: ts.Node) {
      if (ts.isArrowFunction(node)) {
        result = isAsyncFunction(node, typeChecker, ts);
      }
      ts.forEachChild(node, visit);
    }
    ts.forEachChild(sourceFile, visit);

    expect(result).toBe(true);
  });
});

