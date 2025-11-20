'use runner';

import type { Runner } from 'runners';

// Module-level directive applies to all exported functions in this file
export const testOne: Runner = async (ctx) => {
  const { page, url, log } = ctx;
  log('Test one', { url });
  return {
    name: 'test_one',
    status: 'pass',
    details: {},
  };
};

export const testTwo: Runner = async (ctx) => {
  const { page, url, log } = ctx;
  log('Test two', { url });
  return {
    name: 'test_two',
    status: 'pass',
    details: {},
  };
};

