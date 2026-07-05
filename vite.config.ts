import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Bundle the whole app (JS + CSS) into a single self-contained dist/index.html.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
  },
});
