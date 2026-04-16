import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    testTimeout: 30000,
    include: ['src/**/*.test.js', 'test/**/*.test.js'],
  },
});
