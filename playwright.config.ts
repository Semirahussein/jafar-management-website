import { defineConfig } from "@playwright/test";

const FRONTEND_PORT = 3000;
const BACKEND_PORT = 8080;

/**
 * Phase One E2E suite configuration.
 *
 * Boots BOTH the real Spring Boot backend (against the isolated, disposable
 * "e2e" H2 profile - see backend/src/main/resources/application-e2e.properties)
 * and a production-style Next.js server, then drives the real UI with a real
 * browser against the real API.
 *
 * reuseExistingServer is explicitly false for both processes: a stale backend
 * left running from a previous crashed run must never be mistaken for a
 * freshly-seeded one (ddl-auto=create-drop means a stale instance could have
 * arbitrary leftover data, or none of the current run's bootstrap admin
 * session semantics). Playwright will refuse to start (port already in use)
 * rather than silently reuse a server it didn't launch, which is exactly the
 * guard we want - any leftover process from an earlier failed run must be
 * killed manually before the next run (see README note in e2e/README is not
 * added; documented in the final report instead).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "mvn -o spring-boot:run -Dspring-boot.run.profiles=e2e",
      cwd: "backend",
      url: `http://localhost:${BACKEND_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 150_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "npm run build && npm run start -- -p 3000",
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 150_000,
      env: { BACKEND_URL: `http://localhost:${BACKEND_PORT}` },
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
