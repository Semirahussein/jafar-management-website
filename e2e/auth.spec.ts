import { test, expect } from "./fixtures";
import { uiLogin, nav, alertBox, statusNotice } from "./utils/ui";

// Workflow A: Authentication, against the real backend + real browser.
// Covers AUTH-001/002/006/008/009 at the true E2E level (AUTH-008/009 were
// previously "Not Run" / "Component-level only" in the RTM).

test.describe("Workflow A: Authentication", () => {
  test("admin signs in with valid credentials and sees the dashboard", async ({ page }) => {
    await uiLogin(page, "admin", "admin1234");
    await expect(nav(page).getByRole("button", { name: "Users", exact: true })).toBeVisible();
    await expect(nav(page).getByText("admin", { exact: true })).toBeVisible();
  });

  test("invalid credentials are rejected and the login form stays up", async ({ page }) => {
    await page.goto("/management");
    await page.getByLabel("Username").fill("admin");
    await page.getByLabel("Password").fill("totally-wrong-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(alertBox(page)).toContainText(/incorrect/i);
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(0);
  });

  test("branch manager sees manager-scoped navigation (no Users)", async ({ page, seed }) => {
    await uiLogin(page, seed.manager1.username, seed.manager1.password);
    const sidebar = nav(page);
    await expect(sidebar.getByRole("button", { name: "Teachers", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "Branches", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "Teacher Attendance", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "Users", exact: true })).toHaveCount(0);
  });

  test("quran teacher sees teacher-scoped navigation (no Teachers/Branches/Users)", async ({ page, seed }) => {
    await uiLogin(page, seed.teacher1.username, seed.teacher1.password);
    const sidebar = nav(page);
    await expect(sidebar.getByRole("button", { name: "Quran Progress", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "Student Attendance", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "Teachers", exact: true })).toHaveCount(0);
    await expect(sidebar.getByRole("button", { name: "Branches", exact: true })).toHaveCount(0);
    await expect(sidebar.getByRole("button", { name: "Teacher Attendance", exact: true })).toHaveCount(0);
    await expect(sidebar.getByRole("button", { name: "Users", exact: true })).toHaveCount(0);
  });

  test("logout clears the session, and a protected view then bounces back to login", async ({ page }) => {
    await uiLogin(page, "admin", "admin1234");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(statusNotice(page)).toContainText("You have signed out.");

    // Reloading (simulating a fresh visit to the protected view after logout)
    // must bounce back to the login form, not restore the authenticated portal.
    await page.reload();
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(0);
  });

  // AUTH-008: previously "Not Run". The real UI workflow for a forgotten
  // password is just an informational notice (no self-service reset exists),
  // which this verifies for real; the admin-performs-the-reset half is
  // exercised in e2e/student-teacher-management.spec.ts (editing a user's
  // password via the Users section).
  test("forgot password shows the admin-managed reset notice (AUTH-008)", async ({ page }) => {
    await page.goto("/management");
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await expect(page.getByText(/Contact an administrator to regain access/i)).toBeVisible();
  });

  // AUTH-009: previously verified only at the component level (mocked API).
  // Here we invalidate the REAL session cookie against the REAL backend and
  // confirm the real jafar:session-expired handling fires end to end.
  test("an expired session bounces to login with the expiry notice (AUTH-009, real browser + real backend)", async ({
    page,
  }) => {
    await uiLogin(page, "admin", "admin1234");
    await page.context().clearCookies({ name: "JSESSIONID" });
    // The click triggers a real 401 from the real backend, which synchronously
    // unmounts this very button as part of the jafar:session-expired handler -
    // Playwright can occasionally observe the element detach between its
    // mousedown/mouseup steps and either retry against a now-absent locator,
    // or the single click can simply land in the brief window before the
    // cookie removal is visible to the next request. Retrying the whole
    // click-then-check sequence a few times makes this deterministic without
    // weakening what's actually being asserted (the end state).
    await expect(async () => {
      const refreshButton = page.getByRole("button", { name: "Refresh data" });
      if (await refreshButton.isVisible().catch(() => false)) {
        await refreshButton.click({ timeout: 3_000 }).catch(() => {});
      }
      await expect(page.getByLabel("Username")).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 30_000, intervals: [500, 1_000, 2_000] });
    await expect(statusNotice(page)).toContainText("Your session expired. Sign in again.");
  });
});
