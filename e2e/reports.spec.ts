import { test, expect } from "./fixtures";
import { uiLogin, goToSection, entityForm, filterForm, field, statusNotice } from "./utils/ui";

// Workflow G: Reporting. Teacher drafts a report, submits it; manager
// reviews it; the full chain's stored result is re-verified by reading it
// back. This is also the "single dedicated complete lifecycle" chain the
// RTM's section 7 flagged as not yet covered by any one test
// (Student/Teacher -> Attendance/Progress -> Report submit -> Report
// review is exercised across this file plus attendance.spec.ts and
// quran-progress.spec.ts, all against the same seeded teacher/student).

test.describe("Workflow G: Reporting (teacher draft -> submit -> manager review)", () => {
  test("teacher drafts and submits a report; manager reviews it; the result matches what was entered", async ({
    page,
    seed,
  }) => {
    const title = `E2E Report ${Date.now()}`;
    const content = "Workflow G: weekly recitation and attendance summary for the E2E suite.";
    const reviewRemarks = "Reviewed via Workflow G E2E spec - looks good.";

    await uiLogin(page, seed.teacher1.username, seed.teacher1.password);
    await goToSection(page, "Reports");
    await page.getByRole("button", { name: "New report", exact: true }).click();

    const form = entityForm(page);
    await expect(field(form, "Report type")).toHaveValue("TEACHER_TO_MANAGER");
    await field(form, "Title").fill(title);
    await field(form, "Report content").fill(content);
    await form.getByRole("button", { name: "Save draft" }).click();
    await expect(statusNotice(page)).toContainText("Report draft saved.");

    const row = page.getByRole("row", { name: new RegExp(title) });
    await expect(row).toContainText("DRAFT");
    await row.getByRole("button", { name: "Submit", exact: true }).click();
    await expect(statusNotice(page)).toContainText("Report submitted for review.");
    await expect(page.getByRole("row", { name: new RegExp(title) })).toContainText("SUBMITTED");

    await page.getByRole("button", { name: "Sign out" }).click();
    await uiLogin(page, seed.manager1.username, seed.manager1.password);
    await goToSection(page, "Reports");
    await field(filterForm(page), "Status").selectOption("SUBMITTED");
    await filterForm(page).getByRole("button", { name: "Filter", exact: true }).click();
    await page.getByRole("button", { name: title }).click();

    await expect(page.getByText(/REPORT · SUBMITTED/)).toBeVisible();
    await page.getByRole("button", { name: "Review submitted report", exact: true }).click();
    await page.getByLabel("Review remarks", { exact: true }).fill(reviewRemarks);
    await page.getByRole("button", { name: "Mark reviewed", exact: true }).click();
    await expect(statusNotice(page)).toContainText("Report marked as reviewed.");

    await expect(page.getByText(/REPORT · REVIEWED/)).toBeVisible();
    await expect(page.getByText(reviewRemarks)).toBeVisible();
    await expect(page.locator(".report-content")).toContainText(content);

    // Re-read it back from the list to confirm the persisted status matches.
    await field(filterForm(page), "Status").selectOption("REVIEWED");
    await filterForm(page).getByRole("button", { name: "Filter", exact: true }).click();
    await expect(page.getByRole("row", { name: new RegExp(title) })).toContainText("REVIEWED");
  });
});
