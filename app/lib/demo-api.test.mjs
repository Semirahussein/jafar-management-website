import { describe, test, expect, beforeEach } from "vitest";
import { demoRequest } from "./demo-api";
import { ApiError } from "./api-error";

async function loginAs(username, password = "demo") {
  return demoRequest("/auth/login", { method: "POST", body: { username, password } });
}

beforeEach(() => {
  sessionStorage.clear();
});

describe("demo-api: auth", () => {
  test("logging in with a known demo account returns the matching session user", async () => {
    const user = await loginAs("admin");
    expect(user).toMatchObject({ username: "admin", role: "ADMINISTRATOR" });
    await expect(demoRequest("/auth/me")).resolves.toMatchObject({ username: "admin" });
  });

  test("an unknown username is rejected with the real backend's message", async () => {
    await expect(loginAs("nobody")).rejects.toMatchObject({ status: 401, message: "The username or password is incorrect." });
  });

  test("a wrong password is rejected the same way", async () => {
    await expect(loginAs("admin", "wrong")).rejects.toMatchObject({ status: 401 });
  });

  test("/auth/me with no session throws 401", async () => {
    await expect(demoRequest("/auth/me")).rejects.toBeInstanceOf(ApiError);
  });

  test("logout clears the session", async () => {
    await loginAs("manager");
    await demoRequest("/auth/logout", { method: "POST" });
    await expect(demoRequest("/auth/me")).rejects.toMatchObject({ status: 401 });
  });
});

describe("demo-api: dashboard shapes by role", () => {
  test("admin dashboard includes totalBranches", async () => {
    await loginAs("admin");
    const dashboard = await demoRequest("/dashboard");
    expect(dashboard).toMatchObject({ totalBranches: 2, totalStudents: 4, totalTeachers: 2 });
  });

  test("manager dashboard is scoped to their own branch, no totalBranches", async () => {
    await loginAs("manager");
    const dashboard = await demoRequest("/dashboard");
    expect(dashboard.totalBranches).toBeUndefined();
    expect(dashboard.totalStudents).toBe(2);
  });

  test("teacher dashboard reports only their assigned students", async () => {
    await loginAs("teacher");
    const dashboard = await demoRequest("/dashboard");
    expect(dashboard.assignedStudents).toBe(2);
  });
});

describe("demo-api: branch scoping on lists", () => {
  test("a manager only sees students in their own branch", async () => {
    await loginAs("manager");
    const page = await demoRequest("/students/search?page=0&size=20");
    expect(page.content.every(s => s.branchId === 1)).toBe(true);
    expect(page.totalElements).toBe(2);
  });

  test("a teacher only sees their own assigned students", async () => {
    await loginAs("teacher");
    const page = await demoRequest("/students/search?page=0&size=20");
    expect(page.content.every(s => s.teacherId === 3)).toBe(true);
  });
});

describe("demo-api: writes actually persist for the session", () => {
  test("recording student attendance creates a record visible on the next fetch", async () => {
    await loginAs("admin");
    await demoRequest("/student-attendance", { method: "POST", body: { studentId: 1, date: "2026-06-01", status: "PRESENT" } });
    const page = await demoRequest("/student-attendance?page=0&size=20");
    expect(page.content).toHaveLength(1);
    expect(page.content[0]).toMatchObject({ studentId: 1, status: "PRESENT", branchId: 1 });
  });

  test("a duplicate same-day attendance record for the same student is rejected", async () => {
    await loginAs("admin");
    await demoRequest("/student-attendance", { method: "POST", body: { studentId: 1, date: "2026-06-01", status: "PRESENT" } });
    await expect(
      demoRequest("/student-attendance", { method: "POST", body: { studentId: 1, date: "2026-06-01", status: "ABSENT" } })
    ).rejects.toMatchObject({ status: 409, message: "Attendance for this date already recorded" });
  });

  test("creating a branch manager account through /users works and the new account can log in", async () => {
    await loginAs("admin");
    const created = await demoRequest("/users", { method: "POST", body: { username: "newmanager", password: "demo123456", role: "BRANCH_MANAGER", branchId: 2, fullName: "New Manager" } });
    expect(created).toMatchObject({ username: "newmanager", role: "BRANCH_MANAGER", branchId: 2 });
    await demoRequest("/auth/logout", { method: "POST" });
    await expect(loginAs("newmanager", "demo123456")).resolves.toMatchObject({ username: "newmanager" });
  });
});

describe("demo-api: reports workflow", () => {
  test("draft -> submit -> review transitions work and reject out-of-state edits", async () => {
    await loginAs("teacher");
    const draft = await demoRequest("/reports", { method: "POST", body: { title: "Weekly report", content: "...", reportType: "TEACHER_TO_MANAGER", periodStart: "2026-06-01", periodEnd: "2026-06-07" } });
    expect(draft.status).toBe("DRAFT");

    const submitted = await demoRequest(`/reports/${draft.id}/submit`, { method: "PUT" });
    expect(submitted.status).toBe("SUBMITTED");

    await expect(
      demoRequest(`/reports/${draft.id}`, { method: "PUT", body: { title: "Edited" } })
    ).rejects.toMatchObject({ message: "Only draft reports can be modified" });

    await loginAs("manager");
    const reviewed = await demoRequest(`/reports/${draft.id}/review`, { method: "PUT", body: { reviewRemarks: "Good work" } });
    expect(reviewed).toMatchObject({ status: "REVIEWED", reviewRemarks: "Good work" });
  });
});
