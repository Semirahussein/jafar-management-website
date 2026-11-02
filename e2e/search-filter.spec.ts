import { test, expect } from "./fixtures";
import { uiLogin, goToSection, filterForm, field } from "./utils/ui";

// Workflow H: Multi-criteria search & filtering, re-verified for real against
// the live backend (AUTH-level component tests already covered SEARCH-008
// against a mocked API; this exercises the identical UI flow against the
// real /api/students/search endpoint).

test.describe("Workflow H: Search & filtering", () => {
  test("searching by a partial name finds the known student", async ({ page, seed }) => {
    await uiLogin(page, "admin", "admin1234");
    await goToSection(page, "Students");
    const partialName = seed.student1.fullName.split(" ")[0]; // "E2E"
    await filterForm(page).getByLabel("Search", { exact: true }).fill(partialName);
    await filterForm(page).getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("button", { name: seed.student1.fullName })).toBeVisible();
  });

  test("combining a branch filter with the search narrows to that branch only", async ({ page, seed }) => {
    await uiLogin(page, "admin", "admin1234");
    await goToSection(page, "Students");
    const form = filterForm(page);
    await field(form, "Search").fill(seed.student1.studentNumber);
    await field(form, "Branch").selectOption({ label: seed.branch1.name });
    await form.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("button", { name: seed.student1.fullName })).toBeVisible();

    // The same student number cannot appear under branch 2.
    await field(form, "Branch").selectOption({ label: seed.branch2.name });
    await form.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("button", { name: seed.student1.fullName })).toHaveCount(0);
    await expect(page.getByText("No students match these filters.")).toBeVisible();
  });

  test("a search with no matches shows the empty-result state, and Reset restores the full list", async ({
    page,
    seed,
  }) => {
    await uiLogin(page, "admin", "admin1234");
    await goToSection(page, "Students");
    const form = filterForm(page);
    await form.getByLabel("Search", { exact: true }).fill("ZZZ-NO-SUCH-STUDENT-EXISTS-ZZZ");
    await form.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByText("No students match these filters.")).toBeVisible();

    await form.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(form.getByLabel("Search", { exact: true })).toHaveValue("");
    // The full (unfiltered) roster is non-empty across the suite's seeded
    // fixtures, so the empty-result message must be gone after Reset.
    await expect(page.getByText("No students match these filters.")).toHaveCount(0);
  });
});
