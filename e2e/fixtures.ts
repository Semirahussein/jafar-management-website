import { test as base, expect } from "@playwright/test";
import { newAuthenticatedApiContext, apiPost, expectOk } from "./utils/api-client";

export const BASE_URL = "http://localhost:3000";
export const ADMIN = { username: "admin", password: "admin1234" };

// A fresh identifier per full `playwright test` invocation. The backend's H2
// database is also fresh per invocation (ddl-auto=create-drop), so this only
// needs to be unique *within* one run; it is still randomised (not just a
// timestamp) so two workers launched in the same millisecond never collide.
export const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function uniq(label: string): string {
  return `${label}_${RUN_ID}_${Math.random().toString(36).slice(2, 7)}`;
}

export type SeedUser = { id: number; username: string; password: string; branchId: number; fullName: string };
export type Seed = {
  branch1: { id: number; name: string };
  branch2: { id: number; name: string };
  manager1: SeedUser;
  teacher1: SeedUser;
  teacher2: SeedUser;
  student1: { id: number; fullName: string; studentNumber: string };
};

const SHARED_PASSWORD = "E2eFixturePass123!";

let seedPromise: Promise<Seed> | null = null;

/**
 * Seeds a minimal, shared cross-cutting fixture set ONCE per test run (memoised
 * at module scope; the suite runs with workers:1 / fullyParallel:false so all
 * spec files share this single Node process and therefore this single seed):
 *   - two branches (so branch-scoping/isolation specs have a second branch)
 *   - a Branch Manager and a Quran Teacher in branch 1, a Quran Teacher in branch 2
 *   - one student in branch 1, assigned to teacher 1
 *
 * Done via direct authenticated API calls (legitimate fixture setup per the
 * test plan), NOT through the UI - the UI-driven creation workflow itself is
 * separately exercised for real by e2e/student-teacher-management.spec.ts.
 */
function doSeed(): Promise<Seed> {
  return (async () => {
    const admin = await newAuthenticatedApiContext(BASE_URL, ADMIN.username, ADMIN.password);
    try {
      const branch1Name = `E2E Branch One ${RUN_ID}`;
      const branch2Name = `E2E Branch Two ${RUN_ID}`;
      const branch1 = await expectOk(
        apiPost(admin, "/api/branches", { name: branch1Name, address: "1 Test Rd" }),
        "create branch1"
      );
      const branch2 = await expectOk(
        apiPost(admin, "/api/branches", { name: branch2Name, address: "2 Test Rd" }),
        "create branch2"
      );

      const managerUsername = uniq("manager1");
      const manager1Raw = await expectOk(
        apiPost(admin, "/api/users", {
          username: managerUsername,
          password: SHARED_PASSWORD,
          role: "BRANCH_MANAGER",
          branchId: branch1.id,
          fullName: "E2E Manager One",
          email: "",
          phone: "",
        }),
        "create manager1"
      );

      const teacher1Username = uniq("teacher1");
      const teacher1Raw = await expectOk(
        apiPost(admin, "/api/users", {
          username: teacher1Username,
          password: SHARED_PASSWORD,
          role: "QURAN_TEACHER",
          branchId: branch1.id,
          fullName: "E2E Teacher One",
          email: "",
          phone: "",
        }),
        "create teacher1"
      );

      const teacher2Username = uniq("teacher2");
      const teacher2Raw = await expectOk(
        apiPost(admin, "/api/users", {
          username: teacher2Username,
          password: SHARED_PASSWORD,
          role: "QURAN_TEACHER",
          branchId: branch2.id,
          fullName: "E2E Teacher Two",
          email: "",
          phone: "",
        }),
        "create teacher2"
      );

      const studentNumber = uniq("STD");
      const studentFullName = `E2E Student One ${RUN_ID}`;
      const student1 = await expectOk(
        apiPost(admin, "/api/students", {
          fullName: studentFullName,
          studentNumber,
          gender: "Female",
          dateOfBirth: null,
          guardianName: "E2E Guardian One",
          guardianPhone: "+251911000111",
          branchId: branch1.id,
          teacherId: teacher1Raw.id,
          enrollmentDate: new Date().toISOString().slice(0, 10),
          currentLevel: "Beginner",
        }),
        "create student1"
      );

      return {
        branch1: { id: branch1.id, name: branch1Name },
        branch2: { id: branch2.id, name: branch2Name },
        manager1: {
          id: manager1Raw.id,
          username: managerUsername,
          password: SHARED_PASSWORD,
          branchId: branch1.id,
          fullName: "E2E Manager One",
        },
        teacher1: {
          id: teacher1Raw.id,
          username: teacher1Username,
          password: SHARED_PASSWORD,
          branchId: branch1.id,
          fullName: "E2E Teacher One",
        },
        teacher2: {
          id: teacher2Raw.id,
          username: teacher2Username,
          password: SHARED_PASSWORD,
          branchId: branch2.id,
          fullName: "E2E Teacher Two",
        },
        student1: { id: student1.id, fullName: studentFullName, studentNumber },
      };
    } finally {
      await admin.dispose();
    }
  })();
}

export function getSeed(): Promise<Seed> {
  if (!seedPromise) seedPromise = doSeed();
  return seedPromise;
}

export const test = base.extend<{ seed: Seed }>({
  seed: async ({}, use) => {
    const seed = await getSeed();
    await use(seed);
  },
});

export { expect };
