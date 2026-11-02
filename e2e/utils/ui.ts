import { Page, Locator, expect } from "@playwright/test";

/** Logs in through the real login form and waits for the portal shell to render. */
export async function uiLogin(page: Page, username: string, password: string) {
  await page.goto("/management");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

export async function uiLogout(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByLabel("Username")).toBeVisible();
}

/** The left sidebar, scoped so nav-button assertions never match page content. */
export function nav(page: Page): Locator {
  return page.locator(".portal-sidebar");
}

/** Clicks a sidebar section and waits for its heading to render. */
export async function goToSection(page: Page, name: string) {
  await nav(page).getByRole("button", { name, exact: true }).click();
  // The page header's <h1> always echoes the active section name; several
  // sections also render an <h2> with the same text inside their card, so
  // scope strictly to the header to avoid a strict-mode ambiguity.
  await expect(page.locator(".portal-header h1")).toHaveText(name);
}

/** The currently open create/edit form (there is ever at most one on screen). */
export function entityForm(page: Page): Locator {
  return page.locator("form.portal-form-grid");
}

/** The section's always-present search/filter form. */
export function filterForm(page: Page): Locator {
  return page.locator("form.student-filters");
}

// Scoped to the app's own alert/notice banner class. Next.js also renders an
// always-present, empty `role="alert"` route announcer
// (#__next-route-announcer__) on every page; matching on `.portal-alert`
// too avoids ever picking that up as a second, unintended match.
export function alertBox(page: Page): Locator {
  return page.locator('.portal-alert[role="alert"]');
}

export function statusNotice(page: Page): Locator {
  return page.locator('.portal-alert[role="status"]');
}

/**
 * Locates a form control (<input>/<select>/<textarea>) by its EXACT label
 * text, scoped to `scope`.
 *
 * NOT implemented with Playwright's built-in `getByLabel(text, { exact:
 * true })`: every field in this app is an implicit label wrapping its
 * control directly (`<label>Branch<select>...</select></label>`), and the
 * browser's accessible-name computation for an implicit label folds in the
 * CONTROL's own rendered text too - for a <select> that means its currently
 * selected <option> text gets appended to the label's accessible name (e.g.
 * "Branch" + "All branches" -> "BranchAll branches"), so an exact match
 * against just "Branch" never resolves and a loose match against "Branch"
 * also incorrectly matches "Branch name" / "Branch manager" etc. elsewhere.
 * Matching on the label's OWN first text node side-steps both problems.
 */
export function field(scope: Locator, exactLabelText: string): Locator {
  const escaped = exactLabelText.replace(/"/g, '\\"');
  return scope
    .locator(`xpath=.//label[normalize-space(string(text()[1]))="${escaped}"]`)
    .locator("input, select, textarea");
}
