import { test, expect, uniq, BASE_URL, ADMIN } from "./fixtures";
import { newAuthenticatedApiContext, apiPost, expectOk } from "./utils/api-client";
import { uiLogin, uiLogout, goToSection, entityForm, filterForm, field, statusNotice } from "./utils/ui";

// Workflow B: Student & teacher management, driven through the real UI as
// an Administrator. Uses its own freshly-created branch/teacher/student
// (independent of the shared `seed` fixture) so this spec is a genuine,
// self-contained exercise of the real creation workflow end to end.

const branchName = uniq("B-Branch");
const teacherUsername = uniq("b-teacher");
const studentNumber = uniq("B-STD");
const studentFullName = `Workflow B Student ${studentNumber}`;

let branchManagerUsername: string;
let branchManagerPassword = "E2eManagerPass123!";

test.describe.configure({ mode: "serial" });

test.describe("Workflow B: Student & teacher management (admin, real UI)", () => {
  test("admin creates a branch through the UI", async ({ page }) => {
    await uiLogin(page, ADMIN.username, ADMIN.password);
    await goToSection(page, "Branches");
    await page.getByRole("button", { name: "Add branch", exact: true }).click();
    const form = entityForm(page);
    await form.getByLabel("Branch name").fill(branchName);
    await form.getByLabel("Address").fill("1 Workflow B Street");
    await form.getByRole("button", { name: "Save branch" }).click();
    await expect(statusNotice(page)).toContainText("Branch created.");

    await filterForm(page).getByLabel("Search name or address").fill(branchName);
    await filterForm(page).getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("cell", { name: branchName })).toBeVisible();
  });

  // GAP: there is no "Add user" control for Administrator/Branch Manager
  // roles anywhere in the UI - the Users section (app/management/portal.js,
  // "Users" tab) only lists and edits EXISTING accounts. Only QURAN_TEACHER
  // accounts can be created through the UI, via Teachers -> "Add Quran
  // teacher". Creating a Branch Manager account is therefore not a workflow
  // the real UI supports today; this is left `fixme` rather than faked.
  test.fixme(
    "admin creates a Branch Manager account through the UI",
    async () => {
      /* no "Add user" / "Add Branch Manager" control exists in the Users section */
    }
  );

  test("admin creates a Quran Teacher through the UI", async ({ page }) => {
    await uiLogin(page, ADMIN.username, ADMIN.password);
    await goToSection(page, "Teachers");
    await page.getByRole("button", { name: "Add Quran teacher", exact: true }).click();
    const form = entityForm(page);
    await form.getByLabel("Full name").fill("Workflow B Teacher");
    await form.getByLabel("Username").fill(teacherUsername);
    await form.getByLabel("Initial password").fill("E2eTeacherPass123!");
    await field(form, "Branch").selectOption({ label: branchName });
    await form.getByRole("button", { name: "Save teacher" }).click();
    await expect(statusNotice(page)).toContainText("Teacher profile and login account created.");

    await filterForm(page).getByLabel("Search", { exact: true }).fill(teacherUsername);
    await filterForm(page).getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("cell", { name: teacherUsername })).toBeVisible();
  });

  test("admin registers a student assigned to that teacher through the UI", async ({ page }) => {
    await uiLogin(page, ADMIN.username, ADMIN.password);
    await goToSection(page, "Students");
    await page.getByRole("button", { name: "Register student", exact: true }).click();
    const form = entityForm(page);
    await form.getByLabel("Full name").fill(studentFullName);
    await form.getByLabel("Student number").fill(studentNumber);
    await form.getByLabel("Guardian name").fill("Workflow B Guardian");
    await form.getByLabel("Guardian phone").fill("+251911222333");
    await field(form, "Branch").selectOption({ label: branchName });
    await field(form, "Teacher").selectOption({ label: teacherUsername });
    await form.getByLabel("Enrollment date").fill(new Date().toISOString().slice(0, 10));
    await form.getByRole("button", { name: "Save student" }).click();
    await expect(statusNotice(page)).toContainText("Student registered.");

    await filterForm(page).getByLabel("Search", { exact: true }).fill(studentNumber);
    await filterForm(page).getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("button", { name: studentFullName })).toBeVisible();
  });

  test("admin views and edits the student profile through the UI", async ({ page }) => {
    await uiLogin(page, ADMIN.username, ADMIN.password);
    await goToSection(page, "Students");
    await filterForm(page).getByLabel("Search", { exact: true }).fill(studentNumber);
    await filterForm(page).getByRole("button", { name: "Search", exact: true }).click();
    await page.getByRole("button", { name: studentFullName }).click();

    await expect(page.getByText("STUDENT PROFILE")).toBeVisible();
    await expect(page.locator("dd", { hasText: studentNumber })).toBeVisible();

    await page.getByRole("button", { name: "Edit student", exact: true }).click();
    const form = entityForm(page);
    await form.getByLabel("Current level").fill("Intermediate");
    await form.getByRole("button", { name: "Save student" }).click();
    await expect(statusNotice(page)).toContainText("Student updated.");

    await filterForm(page).getByLabel("Search", { exact: true }).fill(studentNumber);
    await filterForm(page).getByRole("button", { name: "Search", exact: true }).click();
    await page.getByRole("button", { name: studentFullName }).click();
    await expect(page.locator("dd", { hasText: "Intermediate" })).toBeVisible();
  });

  test("the edited student is visible with the updated details from a Branch Manager's screen", async ({
    page,
  }) => {
    // Create the Branch Manager out-of-band via the real API (see the fixme
    // above - the UI itself has no control for this), scoped to the same
    // branch created in the first test of this file.
    const admin = await newAuthenticatedApiContext(BASE_URL, ADMIN.username, ADMIN.password);
    branchManagerUsername = uniq("b-manager");
    const branches = await expectOk(admin.get("/api/branches/search?q=" + encodeURIComponent(branchName)), "find branch");
    const branchId = branches.content[0].id;
    await expectOk(
      apiPost(admin, "/api/users", {
        username: branchManagerUsername,
        password: branchManagerPassword,
        role: "BRANCH_MANAGER",
        branchId,
        fullName: "Workflow B Manager",
        email: "",
        phone: "",
      }),
      "create workflow-B manager"
    );
    await admin.dispose();

    await uiLogin(page, branchManagerUsername, branchManagerPassword);
    await goToSection(page, "Students");
    await filterForm(page).getByLabel("Search", { exact: true }).fill(studentNumber);
    await filterForm(page).getByRole("button", { name: "Search", exact: true }).click();
    await page.getByRole("button", { name: studentFullName }).click();
    await expect(page.locator("dd", { hasText: "Intermediate" })).toBeVisible();
  });

  // AUTH-008, second half: "admin updates password via PUT /api/users/{id}".
  // Driven through the real Users-section edit form, then verified by a real
  // login with the new password.
  test("admin resets a user's password through the Users section (AUTH-008)", async ({ page }) => {
    const newPassword = "E2eResetPass456!";
    await uiLogin(page, ADMIN.username, ADMIN.password);
    await goToSection(page, "Users");
    await filterForm(page).getByLabel("Search", { exact: true }).fill(branchManagerUsername);
    await filterForm(page).getByRole("button", { name: "Search", exact: true }).click();
    await page.getByRole("row", { name: new RegExp(branchManagerUsername) }).getByRole("button", { name: "Edit" }).click();
    const form = entityForm(page);
    await form.getByLabel("New password (optional)").fill(newPassword);
    await form.getByRole("button", { name: "Save account" }).click();
    await expect(statusNotice(page)).toContainText("updated and active.");
    await uiLogout(page);

    await uiLogin(page, branchManagerUsername, newPassword);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    branchManagerPassword = newPassword;
  });
});
