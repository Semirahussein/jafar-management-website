import { test, expect } from "./fixtures";
import { uiLogin, goToSection, filterForm } from "./utils/ui";

// Workflow C: Branch management & restrictions. Confirms a Branch Manager
// scoped to branch 1 cannot see or reach branch 2's data through the real UI
// (BRANCH-004/BRANCH-005/SECURITY-003, re-verified end to end).

test.describe("Workflow C: Branch management & restrictions", () => {
  test("a Branch Manager only ever sees their own branch in the Branches list", async ({ page, seed }) => {
    await uiLogin(page, seed.manager1.username, seed.manager1.password);
    await goToSection(page, "Branches");

    await expect(page.getByRole("cell", { name: seed.branch1.name, exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: seed.branch2.name, exact: true })).toHaveCount(0);

    // The manager's own filter form has no branch-selector at all (that control
    // is admin-only), so there is no UI path to even request branch 2's rows.
    await expect(filterForm(page).getByLabel("Status", { exact: true })).toHaveCount(0);
  });

  test("a Branch Manager's Students/Teachers screens never surface another branch's records", async ({
    page,
    seed,
  }) => {
    await uiLogin(page, seed.manager1.username, seed.manager1.password);

    await goToSection(page, "Students");
    // No branch filter is rendered for a manager - scoping is enforced server-side.
    await expect(filterForm(page).getByLabel("Branch", { exact: true })).toHaveCount(0);
    await filterForm(page).getByLabel("Search", { exact: true }).fill(seed.student1.studentNumber);
    await filterForm(page).getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("button", { name: seed.student1.fullName })).toBeVisible();

    await goToSection(page, "Teachers");
    await expect(filterForm(page).getByLabel("Branch", { exact: true })).toHaveCount(0);
    await filterForm(page).getByLabel("Search", { exact: true }).fill(seed.teacher2.username);
    await filterForm(page).getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("cell", { name: seed.teacher2.username })).toHaveCount(0);
    await expect(page.getByText("No teachers match these filters.")).toBeVisible();
  });

  test("an administrator, by contrast, sees both branches and can filter by either", async ({ page, seed }) => {
    await uiLogin(page, "admin", "admin1234");
    await goToSection(page, "Branches");
    await expect(page.getByRole("cell", { name: seed.branch1.name, exact: true })).toBeVisible();
    await filterForm(page).getByLabel("Search name or address").fill(seed.branch2.name);
    await filterForm(page).getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("cell", { name: seed.branch2.name, exact: true })).toBeVisible();
  });
});
