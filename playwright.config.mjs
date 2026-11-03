import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./test/browser",
  timeout: 45000,
  expect: { timeout: 15000 },
  workers: 1,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "evidence/BrowserTests.json" }]],
  use: { baseURL: "http://127.0.0.1:4173", launchOptions: { timeout: 10000 } },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    {
      name: "firefox",
      use: {
        browserName: "firefox",
        launchOptions: {
          timeout: 10000,
          env: { ...process.env, MOZ_DISABLE_CONTENT_SANDBOX: "1" },
        },
      },
    },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: {
    command: "npm run serve",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
  },
});
