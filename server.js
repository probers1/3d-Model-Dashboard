// Entry point for running the application in a Node environment.
// During development or in the test harness, we use ts-node to execute the
// TypeScript source directly.  In production the TypeScript code is
// compiled to JavaScript in the `dist` directory and this file simply
// forwards to that output.

// If ts-node is available (e.g., during tests), load the TS source.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('ts-node').register({ transpileOnly: true });
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('./src/server.ts');
} catch (e) {
  // Fallback to compiled JavaScript
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('./dist/server.js');
}