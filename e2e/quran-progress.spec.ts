import { test, expect } from "./fixtures";
import { uiLogin, goToSection, entityForm, filterForm, field, statusNotice } from "./utils/ui";

// Workflow E: Quran progress. Teacher records progress for an assigned
// student; the record then appears in that student's progress history.

test.describe("Workflow E: Quran progress tracking", () => {
  test("teacher records Quran progress and it appears in the student's progress history", async ({
    page,
    seed,
  }) => {
    const surahMarker = `E2E-Surah-${Date.now()}`;

    await uiLogin(page, seed.teacher1.username, seed.teacher1.password);
    await goToSection(page, "Quran Progress");
    await page.getByRole("button", { name: "Record progress", exact: true }).click();

    const form = entityForm(page);
    await field(form, "Student").selectOption({ label: `${seed.student1.fullName} · ${seed.student1.studentNumber}` });
    await field(form, "Surah").fill(surahMarker);
    await field(form, "Start ayah").fill("1");
    await field(form, "End ayah").fill("15");
    await field(form, "Activity").selectOption("MEMORIZATION");
    await field(form, "Result").selectOption("EXCELLENT");
    await field(form, "Remarks").fill("Workflow E remarks");
    await form.getByRole("button", { name: "Save progress" }).click();
    await expect(statusNotice(page)).toContainText("Quran progress recorded.");

    const row = page.getByRole("row", { name: new RegExp(surahMarker) });
    await expect(row).toContainText("1–15");
    await expect(row).toContainText("MEMORIZATION");
    await expect(row).toContainText("EXCELLENT");

    // Re-verify from the student's progress history view by filtering Quran
    // Progress to this one student (as an admin, who can also filter by branch).
    await page.getByRole("button", { name: "Sign out" }).click();
    await uiLogin(page, "admin", "admin1234");
    await goToSection(page, "Quran Progress");
    await field(filterForm(page), "Surah").fill(surahMarker);
    await filterForm(page).getByRole("button", { name: "Filter", exact: true }).click();
    const historyRow = page.getByRole("row", { name: new RegExp(surahMarker) });
    await expect(historyRow).toBeVisible();
    await expect(historyRow).toContainText(seed.student1.fullName);
  });
});
