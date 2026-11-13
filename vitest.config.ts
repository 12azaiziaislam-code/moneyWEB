import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    reporters: 'default',
  },
  resolve: {
    // Server-side modules are imported directly by the tests (no bundling needed).
    conditions: ['node', 'import'],
  },
});
