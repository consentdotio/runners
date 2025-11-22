import ts from 'typescript/lib/tsserverlibrary';
import { describe, expect, it } from 'vitest';
import { getCustomDiagnostics } from './diagnostics';
import {
  createTestProgram,
  expectDiagnostic,
  expectNoDiagnostic,
} from './test-helpers';

describe('getCustomDiagnostics', () => {
  describe('Error 9001: Runner function must be async', () => {
    it('warns when runner function is not async', () => {
      const source = `
        export function myRunner() {
          'use runner';
          return 123;
        }
      `;

      const { program } = createTestProgram(source);
      const diagnostics = getCustomDiagnostics('test.ts', program, ts);

      expectDiagnostic(diagnostics, {
        code: 9001,
        messageIncludes: 'async',
      });
    });

    it('warns when runner function does not return Promise', () => {
      const source = `
        export function myRunner(): number {
          'use runner';
          return 123;
        }
      `;

      const { program } = createTestProgram(source);
      const diagnostics = getCustomDiagnostics('test.ts', program, ts);

      expectDiagnostic(diagnostics, {
        code: 9001,
        messageIncludes: 'Promise',
      });
    });

    it('does not warn when runner function is async', () => {
      const source = `
        export async function myRunner() {
          'use runner';
          return 123;
        }
      `;

      const { program } = createTestProgram(source);
      const diagnostics = getCustomDiagnostics('test.ts', program, ts);

      expectNoDiagnostic(diagnostics, 9001);
    });

    it('does not warn when runner function returns Promise', () => {
      const source = `
        export function myRunner(): Promise<number> {
          'use runner';
          return Promise.resolve(123);
        }
      `;

      const { program } = createTestProgram(source);
      const diagnostics = getCustomDiagnostics('test.ts', program, ts);

      expectNoDiagnostic(diagnostics, 9001);
    });
  });

  describe('Error 9008: Misspelled directives', () => {
    it('warns when using "use runer" instead of "use runner"', () => {
      const source = `
        export async function myRunner() {
          'use runer';
          return 123;
        }
      `;

      const { program } = createTestProgram(source);
      const diagnostics = getCustomDiagnostics('test.ts', program, ts);

      expectDiagnostic(diagnostics, {
        code: 9008,
        messageIncludes: 'typo',
      });
    });

    it('warns when using "use runnr" instead of "use runner"', () => {
      const source = `
        export async function myRunner() {
          'use runnr';
          return 123;
        }
      `;

      const { program } = createTestProgram(source);
      const diagnostics = getCustomDiagnostics('test.ts', program, ts);

      expectDiagnostic(diagnostics, {
        code: 9008,
        messageIncludes: 'use runner',
      });
    });

    it('does not warn when directive is correct', () => {
      const source = `
        export async function myRunner() {
          'use runner';
          return 123;
        }
      `;

      const { program } = createTestProgram(source);
      const diagnostics = getCustomDiagnostics('test.ts', program, ts);

      expectNoDiagnostic(diagnostics, 9008);
    });

    it('does not warn for typos too different from directive', () => {
      const source = `
        export async function myFunc() {
          'hello world';
          return 123;
        }
      `;

      const { program } = createTestProgram(source);
      const diagnostics = getCustomDiagnostics('test.ts', program, ts);

      expectNoDiagnostic(diagnostics, 9008);
    });
  });

  describe('Edge cases', () => {
    it('does not error on empty file', () => {
      const source = '';

      const { program } = createTestProgram(source);
      const diagnostics = getCustomDiagnostics('test.ts', program, ts);

      expect(diagnostics).toEqual([]);
    });

    it('ignores functions without directives', () => {
      const source = `
        export function normalFunction() {
          return 123;
        }
      `;

      const { program } = createTestProgram(source);
      const diagnostics = getCustomDiagnostics('test.ts', program, ts);

      expect(diagnostics).toEqual([]);
    });

    it('handles arrow functions with directives', () => {
      const source = `
        export const myRunner = () => {
          'use runner';
          return 123;
        };
      `;

      const { program } = createTestProgram(source);
      const diagnostics = getCustomDiagnostics('test.ts', program, ts);

      expectDiagnostic(diagnostics, { code: 9001 });
    });
  });
});

