import { defineConfig } from '@playwright/test';

// Installed browsers only (channel): Playwright never downloads one here.
export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'build/evidence/session/playwright',
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173/hush/',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    { name: 'chrome', use: { channel: 'chrome' } },
    { name: 'edge', use: { channel: 'msedge' } },
  ],
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/hush/',
    reuseExistingServer: false,
    timeout: 60000,
  },
});
