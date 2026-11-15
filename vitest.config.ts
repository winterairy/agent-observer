import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/api/**/*.test.ts', 'tests/script/**/*.test.ts'],
    // tests/script는 자식 프로세스·분리 전송을 기다리므로 넉넉히
    testTimeout: 20_000,
    environment: 'node',
  },
});
