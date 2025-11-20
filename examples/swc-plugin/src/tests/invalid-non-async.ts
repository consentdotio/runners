// This file demonstrates what happens when you try to use "use runner" 
// on a non-async function. The SWC plugin will emit a compilation error.
//
// Uncomment the code below to see the error:
//
// import type { RunnerTest } from 'runners';
//
// // This will cause a compilation error - non-async function with directive
// export const invalidTest = (ctx: any) => {
//   'use runner'; // Error: Functions marked with "use runner" must be async functions
//
//   return {
//     name: 'invalid_test',
//     status: 'pass' as const,
//     details: {},
//   };
// };


