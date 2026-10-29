import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    // Components render with a tiny stand-in for react-native (DOM elements).
    alias: { 'react-native': fileURLToPath(new URL('./test/react-native-stub.tsx', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
