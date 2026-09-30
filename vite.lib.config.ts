// The library build: dist/ic-dice.js, one ES module with the sounds and Jost
// inlined as data URIs, so a host copies no files. three and cannon-es are the
// host's (three a peer, cannon-es a dependency), so they stay outside it.
// dist/faces.js is the faces alone (ic-dice/faces): the Schools and sub-stances
// as data, with no three, cannon-es or browser code, for a server to import.
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    lib: { entry: { 'ic-dice': 'src/index.ts', faces: 'src/faces.ts' }, formats: ['es'], fileName: (_format, name) => `${name}.js` },
    rolldownOptions: { external: [/^three(\/.*)?$/, /^cannon-es$/] },
  },
});
