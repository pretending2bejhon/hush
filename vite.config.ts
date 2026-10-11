import { execFileSync } from 'node:child_process';
import { defineConfig } from 'vite';

// D15: the built page carries the commit it was built from, so probe:live can match the deploy to its tag.
function buildSha(): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

export default defineConfig({
  base: '/hush/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
  },
  plugins: [
    {
      name: 'hush-build-meta',
      transformIndexHtml(html) {
        return {
          html,
          tags: [{ tag: 'meta', attrs: { name: 'hush-build', content: buildSha() }, injectTo: 'head' }],
        };
      },
    },
  ],
});
