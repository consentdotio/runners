import type { RunnerTest } from 'runners';

// Function-level directive - each function has its own directive
export const testWithDirective: RunnerTest = async (ctx) => {
  'use runner';

  const { page, url, log } = ctx;
  log('Test with directive', { url });
  return {
    name: 'test_with_directive',
    status: 'pass',
    details: {},
  };
};

export const testWithoutDirective: RunnerTest = async (ctx) => {
  // This function doesn't have the directive
  const { page, url, log } = ctx;
  log('Test without directive', { url });
  return {
    name: 'test_without_directive',
    status: 'pass',
    details: {},
  };
};

