// The library build: dist/ic-dice.js, one ES module with the sounds and Jost
// inlined as data URIs, so a host copies no files. three and cannon-es are the
// host's (three a peer, cannon-es a dependency), so they stay outside it.
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'ic-dice.js' },
    rolldownOptions: { external: [/^three(\/.*)?$/, /^cannon-es$/] },
  },
});
