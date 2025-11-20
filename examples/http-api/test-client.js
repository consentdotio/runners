#!/usr/bin/env node

/**
 * Example client for testing the HTTP runner API
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_URL = process.argv[2] || 'https://example.com';

async function testRunner() {
  const requestBody = {
    url: TEST_URL,
    tests: ['exampleTitleVisibleTest', 'cookieBannerVisibleTest'],
    runId: `test-${Date.now()}`,
  };

  console.log('Sending request to:', API_URL);
  console.log('Request body:', JSON.stringify(requestBody, null, 2));
  console.log('');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Error:', result);
      process.exit(1);
    }

    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));

    // Check if all tests passed
    const allPassed = result.results.every((r) => r.status === 'pass');
    if (!allPassed) {
      console.error('\nSome tests failed!');
      process.exit(1);
    }

    console.log('\nAll tests passed!');
  } catch (error) {
    console.error('Request failed:', error);
    process.exit(1);
  }
}

testRunner();

