import { test, expect } from "./fixtures";
import { uiLogin, goToSection, entityForm, filterForm, field } from "./utils/ui";

// Workflow I: Cross-session persistence & authorization, using genuinely
// separate Playwright browser contexts (independent cookie jars/storage,
// simulating different physical browsers/devices) rather than tabs sharing
// one session.

test.describe("Workflow I: Cross-session persistence & authorization", () => {
  test("a record created by one role in context A is read back by an authorized role in context B, and denied to an unauthorized role in context C", async ({
    browser,
    seed,
  }) => {
    const surahMarker = `E2E-CrossSession-${Date.now()}`;

    // --- Context A: the assigned teacher creates a Quran progress record ---
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await uiLogin(pageA, seed.teacher1.username, seed.teacher1.password);
    await goToSection(pageA, "Quran Progress");
    await pageA.getByRole("button", { name: "Record progress", exact: true }).click();
    const formA = entityForm(pageA);
    await field(formA, "Student").selectOption({ label: `${seed.student1.fullName} · ${seed.student1.studentNumber}` });
    await field(formA, "Surah").fill(surahMarker);
    await field(formA, "Start ayah").fill("1");
    await field(formA, "End ayah").fill("5");
    await field(formA, "Activity").selectOption("RECITATION");
    await field(formA, "Result").selectOption("GOOD");
    await formA.getByRole("button", { name: "Save progress" }).click();
    await expect(pageA.getByRole("row", { name: new RegExp(surahMarker) })).toBeVisible();
    await contextA.close();

    // --- Context B: the branch manager (same branch) reads it back ---
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await uiLogin(pageB, seed.manager1.username, seed.manager1.password);
    await goToSection(pageB, "Quran Progress");
    await field(filterForm(pageB), "Surah").fill(surahMarker);
    await filterForm(pageB).getByRole("button", { name: "Filter", exact: true }).click();
    const rowB = pageB.getByRole("row", { name: new RegExp(surahMarker) });
    await expect(rowB).toBeVisible();
    await expect(rowB).toContainText(seed.student1.fullName);
    await expect(rowB).toContainText("RECITATION");
    await contextB.close();

    // --- Context C: an unrelated teacher in a different branch must not see it ---
    const contextC = await browser.newContext();
    const pageC = await contextC.newPage();
    await uiLogin(pageC, seed.teacher2.username, seed.teacher2.password);
    await goToSection(pageC, "Quran Progress");
    await field(filterForm(pageC), "Surah").fill(surahMarker);
    await filterForm(pageC).getByRole("button", { name: "Filter", exact: true }).click();
    await expect(pageC.getByRole("row", { name: new RegExp(surahMarker) })).toHaveCount(0);
    await expect(pageC.getByText("No Quran progress records match these filters.")).toBeVisible();
    await contextC.close();
  });
});
