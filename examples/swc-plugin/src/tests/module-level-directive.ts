'use runner';

import type { RunnerTest } from 'runners';

// Module-level directive applies to all exported functions in this file
export const testOne: RunnerTest = async (ctx) => {
  const { page, url, log } = ctx;
  log('Test one', { url });
  return {
    name: 'test_one',
    status: 'pass',
    details: {},
  };
};

export const testTwo: RunnerTest = async (ctx) => {
  const { page, url, log } = ctx;
  log('Test two', { url });
  return {
    name: 'test_two',
    status: 'pass',
    details: {},
  };
};

