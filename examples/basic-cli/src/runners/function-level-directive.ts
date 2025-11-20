import type { Runner } from 'runners';

// Function-level directive - each function has its own directive
export const testWithDirective: Runner = async (ctx) => {
  'use runner';

  const { page, url, log } = ctx;
  log('Test with directive', { url });
  return {
    name: 'test_with_directive',
    status: 'pass',
    details: {},
  };
};

export const testWithoutDirective: Runner = async (ctx) => {
  // This function doesn't have the directive
  const { page, url, log } = ctx;
  log('Test without directive', { url });
  return {
    name: 'test_without_directive',
    status: 'pass',
    details: {},
  };
};

