import { Locator } from "@playwright/test";
import { test, expect } from "./fixtures";
import { uiLogin, goToSection, entityForm, field, alertBox, statusNotice } from "./utils/ui";

/** The Teacher Attendance form's "Teacher" select renders options as
 * "{fullName || username} · {branchName}"; select by matching the seeded
 * teacher's full name in the option text rather than depending on the exact
 * combined label string. */
async function selectTeacherByFullName(form: Locator, fullName: string) {
  const select = field(form, "Teacher");
  const optionValue = await select.locator(`option:has-text("${fullName}")`).first().getAttribute("value");
  if (!optionValue) throw new Error(`No "Teacher" option found containing "${fullName}"`);
  await select.selectOption(optionValue);
}

// Workflow D: Attendance. Student attendance recorded by the assigned
// teacher, teacher attendance recorded by the branch manager, both reloaded
// and re-verified from the database, plus the real duplicate-record
// rejection surfacing in the UI (ATT-STUDENT-002 / ATT-TEACHER-002, now
// exercised end to end through a real browser instead of MockMvc).

test.describe.configure({ mode: "serial" });

test.describe("Workflow D: Attendance", () => {
  const remarkMarker = `Workflow-D-${Date.now()}`;
  let recordedDate: string;

  test("teacher records attendance for an assigned student", async ({ page, seed }) => {
    await uiLogin(page, seed.teacher1.username, seed.teacher1.password);
    await goToSection(page, "Student Attendance");
    await page.getByRole("button", { name: "Record attendance", exact: true }).click();

    const form = entityForm(page);
    recordedDate = await field(form, "Date").inputValue();
    await field(form, "Student").selectOption({ label: `${seed.student1.fullName} · ${seed.student1.studentNumber}` });
    await field(form, "Status").selectOption("PRESENT");
    await field(form, "Remarks").fill(remarkMarker);
    await form.getByRole("button", { name: "Save attendance" }).click();
    await expect(statusNotice(page)).toContainText("Student attendance recorded.");

    const row = page.getByRole("row", { name: new RegExp(remarkMarker) });
    await expect(row).toContainText("PRESENT");
    await expect(row).toContainText(recordedDate);
  });

  test("the saved student attendance record survives a reload with the correct values", async ({ page, seed }) => {
    await uiLogin(page, seed.teacher1.username, seed.teacher1.password);
    await page.reload();
    await goToSection(page, "Student Attendance");
    const row = page.getByRole("row", { name: new RegExp(remarkMarker) });
    await expect(row).toContainText("PRESENT");
    await expect(row).toContainText(recordedDate);
    await expect(row).toContainText(seed.student1.fullName);
  });

  test("a duplicate same-day attendance record for the same student is rejected and surfaced in the UI", async ({
    page,
    seed,
  }) => {
    await uiLogin(page, seed.teacher1.username, seed.teacher1.password);
    await goToSection(page, "Student Attendance");
    await page.getByRole("button", { name: "Record attendance", exact: true }).click();
    const form = entityForm(page);
    await field(form, "Student").selectOption({ label: `${seed.student1.fullName} · ${seed.student1.studentNumber}` });
    await field(form, "Status").selectOption("ABSENT");
    await form.getByRole("button", { name: "Save attendance" }).click();
    await expect(alertBox(page)).toContainText(/already recorded/i);
    // The rejected attempt must not have overwritten the original record.
    await expect(page.getByRole("row", { name: new RegExp(remarkMarker) })).toContainText("PRESENT");
  });

  test("manager records attendance for a teacher in their own branch", async ({ page, seed }) => {
    await uiLogin(page, seed.manager1.username, seed.manager1.password);
    await goToSection(page, "Teacher Attendance");
    await page.getByRole("button", { name: "Record attendance", exact: true }).click();

    const form = entityForm(page);
    const teacherDate = await field(form, "Date").inputValue();
    await selectTeacherByFullName(form, seed.teacher1.fullName);
    await field(form, "Status").selectOption("LATE");
    await field(form, "Remarks").fill(remarkMarker);
    await form.getByRole("button", { name: "Save attendance" }).click();
    await expect(statusNotice(page)).toContainText("Teacher attendance recorded.");

    const row = page.getByRole("row", { name: new RegExp(remarkMarker) });
    await expect(row).toContainText("LATE");
    await expect(row).toContainText(teacherDate);

    // Reload and re-verify it persisted.
    await page.reload();
    await goToSection(page, "Teacher Attendance");
    await expect(page.getByRole("row", { name: new RegExp(remarkMarker) })).toContainText("LATE");
  });

  test("a duplicate same-day teacher attendance record is rejected and surfaced in the UI", async ({
    page,
    seed,
  }) => {
    await uiLogin(page, seed.manager1.username, seed.manager1.password);
    await goToSection(page, "Teacher Attendance");
    await page.getByRole("button", { name: "Record attendance", exact: true }).click();
    const form = entityForm(page);
    await selectTeacherByFullName(form, seed.teacher1.fullName);
    await field(form, "Status").selectOption("ABSENT");
    await form.getByRole("button", { name: "Save attendance" }).click();
    await expect(alertBox(page)).toContainText(/already recorded/i);
  });
});
