import { test, expect, uniq, BASE_URL, ADMIN } from "./fixtures";
import { newAuthenticatedApiContext, apiPost, expectOk } from "./utils/api-client";
import { uiLogin, goToSection, statusNotice } from "./utils/ui";

// Workflow F: Dashboards. Creates a small, fully isolated set of known
// records (a fresh branch, teacher, two students, one attendance record) and
// compares each role's dashboard against that known data - exact counts for
// the branch-scoped Manager/Teacher dashboards (nothing else touches this
// fresh branch), and a before/after delta for the global Administrator
// dashboard (other specs' fixtures also contribute to that global total, so
// only the delta this test itself produced is a safe assertion).

type Branch = { id: number; name: string };
type NumberedResult = { totalElements: number; content: unknown[] };

test.describe("Workflow F: Dashboards", () => {
  test("role dashboards reflect exactly the records just created", async ({ page }) => {
    // Baseline admin dashboard totals, BEFORE creating ANYTHING in this test
    // (including the branch itself), so the delta assertions below only rely
    // on what this test itself introduces, regardless of what other specs'
    // fixtures already contributed to the global totals.
    await uiLogin(page, ADMIN.username, ADMIN.password);
    const baselineBranches = Number(await page.locator(".portal-stats .stat:has-text('Branches') strong").innerText());
    const baselineStudents = Number(await page.locator(".portal-stats .stat:has-text('Students') strong").innerText());

    const admin = await newAuthenticatedApiContext(BASE_URL, ADMIN.username, ADMIN.password);
    const branchName = uniq("F-Branch");
    const branch: Branch = await expectOk(apiPost(admin, "/api/branches", { name: branchName, address: "F St" }), "create F branch");

    const managerUsername = uniq("f-manager");
    const managerPassword = "E2eFManagerPass123!";
    await expectOk(
      apiPost(admin, "/api/users", {
        username: managerUsername,
        password: managerPassword,
        role: "BRANCH_MANAGER",
        branchId: branch.id,
        fullName: "F Manager",
        email: "",
        phone: "",
      }),
      "create F manager"
    );

    const teacherUsername = uniq("f-teacher");
    const teacherPassword = "E2eFTeacherPass123!";
    const teacher = await expectOk(
      apiPost(admin, "/api/users", {
        username: teacherUsername,
        password: teacherPassword,
        role: "QURAN_TEACHER",
        branchId: branch.id,
        fullName: "F Teacher",
        email: "",
        phone: "",
      }),
      "create F teacher"
    );

    const todayIso = new Date().toISOString().slice(0, 10);
    const student1 = await expectOk(
      apiPost(admin, "/api/students", {
        fullName: `F Student One ${branchName}`,
        studentNumber: uniq("F-STD1"),
        gender: "Male",
        guardianName: "F Guardian",
        guardianPhone: "+251911333444",
        branchId: branch.id,
        teacherId: teacher.id,
        enrollmentDate: todayIso,
        currentLevel: "Beginner",
      }),
      "create F student1"
    );
    await expectOk(
      apiPost(admin, "/api/students", {
        fullName: `F Student Two ${branchName}`,
        studentNumber: uniq("F-STD2"),
        gender: "Female",
        guardianName: "F Guardian 2",
        guardianPhone: "+251911333555",
        branchId: branch.id,
        teacherId: teacher.id,
        enrollmentDate: todayIso,
        currentLevel: "Beginner",
      }),
      "create F student2"
    );
    await expectOk(
      apiPost(admin, "/api/student-attendance", { studentId: student1.id, date: todayIso, status: "PRESENT", remarks: "F attendance" }),
      "create F attendance"
    );
    await admin.dispose();

    // --- Administrator dashboard: delta-based ---
    await page.getByRole("button", { name: "Refresh data" }).click();
    await expect
      .poll(async () => Number(await page.locator(".portal-stats .stat:has-text('Branches') strong").innerText()))
      .toBe(baselineBranches + 1);
    await expect
      .poll(async () => Number(await page.locator(".portal-stats .stat:has-text('Students') strong").innerText()))
      .toBe(baselineStudents + 2);

    // --- Branch Manager dashboard: exact (this branch is brand new) ---
    await page.getByRole("button", { name: "Sign out" }).click();
    await uiLogin(page, managerUsername, managerPassword);
    await expect(page.locator(".portal-stats .stat:has-text('Students in branch') strong")).toHaveText("2");
    await expect(page.locator(".portal-card:has-text(\"Today’s student attendance\") strong").first()).toHaveText("1");

    // --- Quran Teacher dashboard: exact assigned-student count ---
    await page.getByRole("button", { name: "Sign out" }).click();
    await uiLogin(page, teacherUsername, teacherPassword);
    await expect(page.locator(".portal-stats .stat:has-text('Assigned students') strong")).toHaveText("2");
  });

  test("an empty-dataset branch renders zero counts, not errors (DASHBOARD-004)", async ({ page }) => {
    const admin = await newAuthenticatedApiContext(BASE_URL, ADMIN.username, ADMIN.password);
    const branchName = uniq("F-Empty-Branch");
    const branch: Branch = await expectOk(apiPost(admin, "/api/branches", { name: branchName, address: "Empty St" }), "create empty branch");
    const managerUsername = uniq("f-empty-manager");
    const managerPassword = "E2eFEmptyPass123!";
    await expectOk(
      apiPost(admin, "/api/users", {
        username: managerUsername,
        password: managerPassword,
        role: "BRANCH_MANAGER",
        branchId: branch.id,
        fullName: "F Empty Manager",
        email: "",
        phone: "",
      }),
      "create empty-branch manager"
    );
    await admin.dispose();

    await uiLogin(page, managerUsername, managerPassword);
    await expect(page.locator(".portal-stats .stat:has-text('Students in branch') strong")).toHaveText("0");
    await expect(page.getByText("No Quran progress records yet.")).toBeVisible();
    // No error alert should ever appear for a legitimately empty dashboard
    // (scoped to the app's own alert banner - Next.js also renders a hidden,
    // always-present role="alert" route announcer that is not this).
    await expect(page.locator('.portal-alert[role="alert"]')).toHaveCount(0);
  });
});
