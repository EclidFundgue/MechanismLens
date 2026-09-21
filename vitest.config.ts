import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/renderers/**/*.test.{ts,tsx}'], environment: 'node' },
});
