// The demo page (index.html) and the tests. The demo builds into site/, which
// is what Vercel serves (vercel.json); dist/ is the library's.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: { target: 'es2022', outDir: 'site' },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
