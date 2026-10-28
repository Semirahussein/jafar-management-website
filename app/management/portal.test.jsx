import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ManagementPortal from "./portal";
import { createApiClient } from "../lib/api";

vi.mock("../lib/api", () => ({ createApiClient: vi.fn() }));

// ---------------------------------------------------------------------------
// Mock API client helpers
// ---------------------------------------------------------------------------

function makeApi(routes) {
  const calls = [];
  const client = vi.fn(async (path, options = {}) => {
    const method = (options.method || "GET").toUpperCase();
    calls.push({ path, method, options });
    const base = path.split("?")[0];
    for (const route of routes) {
      if (route.method && route.method !== method) continue;
      const matches = typeof route.match === "string" ? base === route.match : route.match.test(base);
      if (!matches) continue;
      const result = typeof route.handler === "function" ? await route.handler(path, options) : route.handler;
      if (result && result.__throw) {
        const err = new Error(result.message);
        err.status = result.status;
        if (result.data) err.data = result.data;
        throw err;
      }
      return result;
    }
    throw new Error(`Unhandled mock request: ${method} ${path}`);
  });
  client.download = vi.fn(async () => {});
  client.calls = calls;
  return client;
}

const emptyPage = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 };

function adminDashboard() {
  return {
    totalBranches: 2, totalStudents: 12, totalTeachers: 3,
    todayStudentAttendance: { present: 7, absent: 1, late: 1, excused: 1, total: 10 },
    todayTeacherAttendance: { present: 2, absent: 0, late: 0, excused: 0, total: 2 },
    recentProgress: [], pendingReports: 3,
  };
}
function managerDashboard() {
  return {
    totalStudents: 8, totalTeachers: 2,
    todayStudentAttendance: { present: 5, absent: 1, late: 0, excused: 0, total: 6 },
    todayTeacherAttendance: { present: 2, absent: 0, late: 0, excused: 0, total: 2 },
    recentProgress: [], pendingReports: 1,
  };
}
function teacherDashboard() {
  return {
    assignedStudents: 5,
    todayAttendance: { present: 3, absent: 1, late: 0, excused: 0, total: 4 },
    recentProgress: [], pendingReports: 2,
  };
}

function loggedOutRoutes() {
  return [
    { method: "GET", match: "/auth/me", handler: () => ({ __throw: true, message: "Unauthorized", status: 401 }) },
  ];
}

function baseLoggedInRoutes({ user, dashboard, students = emptyPage, branches = [], users = emptyPage, teachers = [] }) {
  return [
    { method: "GET", match: "/auth/me", handler: () => user },
    { method: "GET", match: "/dashboard", handler: () => dashboard },
    { method: "GET", match: /^\/students\/search/, handler: () => students },
    { method: "GET", match: "/branches", handler: () => branches },
    { method: "GET", match: /^\/users\/search/, handler: () => users },
    { method: "GET", match: /^\/users\/teachers\/search/, handler: () => ({ content: teachers, totalElements: teachers.length, totalPages: 1, number: 0 }) },
  ];
}

const adminUser = { id: 1, username: "admin", role: "ADMINISTRATOR" };
const managerUser = { id: 2, username: "manager1", role: "BRANCH_MANAGER", branchId: 1 };
const teacherUser = { id: 3, username: "teacher1", role: "QURAN_TEACHER", branchId: 1 };

async function signInAs({ api, username, password }) {
  const user = userEvent.setup();
  render(<ManagementPortal />);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument());
  await user.type(screen.getByLabelText("Username"), username);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByRole("heading", { name: "Dashboard" });
  return user;
}

beforeEach(() => {
  createApiClient.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Login form
// ---------------------------------------------------------------------------

describe("Login", () => {
  test("shows a session check first, then the login form with required username/password fields", async () => {
    const api = makeApi(loggedOutRoutes());
    createApiClient.mockReturnValue(api);
    render(<ManagementPortal />);
    expect(screen.getByText(/checking your session/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument());
    expect(screen.getByLabelText("Username")).toBeRequired();
    expect(screen.getByLabelText("Password")).toBeRequired();
  });

  test("does not call the login API when required fields are left blank", async () => {
    const api = makeApi(loggedOutRoutes());
    createApiClient.mockReturnValue(api);
    render(<ManagementPortal />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument());
    const callsBefore = api.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(api.calls.length).toBe(callsBefore);
  });

  test("shows the server's error message on invalid credentials (HTTP 401)", async () => {
    const routes = [
      ...loggedOutRoutes(),
      { method: "GET", match: "/auth/csrf", handler: () => ({}) },
      { method: "POST", match: "/auth/login", handler: () => ({ __throw: true, message: "The username or password is incorrect.", status: 401 }) },
    ];
    const api = makeApi(routes);
    createApiClient.mockReturnValue(api);
    const user = userEvent.setup();
    render(<ManagementPortal />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument());
    await user.type(screen.getByLabelText("Username"), "teacher1");
    await user.type(screen.getByLabelText("Password"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The username or password is incorrect.");
  });

  test("shows the inactive-account message returned by the API", async () => {
    const routes = [
      ...loggedOutRoutes(),
      { method: "GET", match: "/auth/csrf", handler: () => ({}) },
      { method: "POST", match: "/auth/login", handler: () => ({ __throw: true, message: "This account is inactive. Contact an administrator.", status: 401 }) },
    ];
    const api = makeApi(routes);
    createApiClient.mockReturnValue(api);
    const user = userEvent.setup();
    render(<ManagementPortal />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument());
    await user.type(screen.getByLabelText("Username"), "teacher1");
    await user.type(screen.getByLabelText("Password"), "correctpass");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This account is inactive. Contact an administrator.");
  });

  test("a successful login calls the login API with the entered credentials and loads the portal", async () => {
    const routes = [
      ...loggedOutRoutes(),
      { method: "GET", match: "/auth/csrf", handler: () => ({}) },
      { method: "POST", match: "/auth/login", handler: () => adminUser },
      ...baseLoggedInRoutes({ user: adminUser, dashboard: adminDashboard() }),
    ];
    const api = makeApi(routes);
    createApiClient.mockReturnValue(api);
    await signInAs({ api, username: "admin", password: "admin1234" });
    const loginCall = api.calls.find(c => c.path === "/auth/login");
    expect(loginCall.options.body).toEqual({ username: "admin", password: "admin1234", rememberMe: false });
  });
});

// ---------------------------------------------------------------------------
// Role-specific navigation
// ---------------------------------------------------------------------------

describe("Role-based navigation", () => {
  test("Administrator sees Teachers, Branches, Teacher Attendance and Users", async () => {
    const api = makeApi([
      ...loggedOutRoutes(),
      { method: "GET", match: "/auth/csrf", handler: () => ({}) },
      { method: "POST", match: "/auth/login", handler: () => adminUser },
      ...baseLoggedInRoutes({ user: adminUser, dashboard: adminDashboard() }),
    ]);
    createApiClient.mockReturnValue(api);
    await signInAs({ api, username: "admin", password: "admin1234" });
    for (const name of ["Dashboard", "Students", "Teachers", "Student Attendance", "Quran Progress", "Teacher Attendance", "Branches", "Reports", "Notifications", "Users"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  test("Branch Manager sees Teachers and Branches but not Users", async () => {
    const api = makeApi([
      ...loggedOutRoutes(),
      { method: "GET", match: "/auth/csrf", handler: () => ({}) },
      { method: "POST", match: "/auth/login", handler: () => managerUser },
      ...baseLoggedInRoutes({ user: managerUser, dashboard: managerDashboard(), branches: [{ id: 1, name: "Al-Noor Branch", active: true }] }),
    ]);
    createApiClient.mockReturnValue(api);
    await signInAs({ api, username: "manager1", password: "managerpass" });
    for (const name of ["Teachers", "Teacher Attendance", "Branches"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Users" })).not.toBeInTheDocument();
  });

  test("Quran Teacher sees only the minimal navigation (no Teachers, Teacher Attendance, Branches or Users)", async () => {
    const api = makeApi([
      ...loggedOutRoutes(),
      { method: "GET", match: "/auth/csrf", handler: () => ({}) },
      { method: "POST", match: "/auth/login", handler: () => teacherUser },
      ...baseLoggedInRoutes({ user: teacherUser, dashboard: teacherDashboard() }),
    ]);
    createApiClient.mockReturnValue(api);
    await signInAs({ api, username: "teacher1", password: "teacherpass" });
    for (const name of ["Dashboard", "Students", "Student Attendance", "Quran Progress", "Reports", "Notifications"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    for (const name of ["Teachers", "Teacher Attendance", "Branches", "Users"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });
});

// ---------------------------------------------------------------------------
// Dashboard rendering of API-derived values
// ---------------------------------------------------------------------------

describe("Dashboard", () => {
  test("renders the counts returned by the dashboard API", async () => {
    const api = makeApi([
      ...loggedOutRoutes(),
      { method: "GET", match: "/auth/csrf", handler: () => ({}) },
      { method: "POST", match: "/auth/login", handler: () => adminUser },
      ...baseLoggedInRoutes({ user: adminUser, dashboard: adminDashboard() }),
    ]);
    createApiClient.mockReturnValue(api);
    await signInAs({ api, username: "admin", password: "admin1234" });
    expect(screen.getByText("Branches", { selector: "span" }).nextSibling).toHaveTextContent("2");
    expect(screen.getByText("Active Quran teachers", { selector: "span" }).nextSibling).toHaveTextContent("3");
    expect(screen.getByText("Reports awaiting review", { selector: "span" }).nextSibling).toHaveTextContent("3");
    const studentAttendanceCard = screen.getByText("Today’s student attendance").closest("article");
    expect(studentAttendanceCard).not.toBeNull();
    expect(within(studentAttendanceCard).getByText("Present", { selector: "span" }).nextSibling).toHaveTextContent("7");
  });

  test("shows an unavailable message and the raised error when the dashboard API call fails", async () => {
    const api = makeApi([
      ...loggedOutRoutes(),
      { method: "GET", match: "/auth/csrf", handler: () => ({}) },
      { method: "POST", match: "/auth/login", handler: () => adminUser },
      { method: "GET", match: "/auth/me", handler: () => adminUser },
      { method: "GET", match: "/dashboard", handler: () => ({ __throw: true, message: "Dashboard metrics are currently unavailable.", status: 500 }) },
      { method: "GET", match: /^\/students\/search/, handler: () => emptyPage },
      { method: "GET", match: "/branches", handler: () => [] },
      { method: "GET", match: /^\/users\/search/, handler: () => emptyPage },
      { method: "GET", match: /^\/users\/teachers\/search/, handler: () => ({ content: [], totalElements: 0, totalPages: 0, number: 0 }) },
    ]);
    createApiClient.mockReturnValue(api);
    const user = userEvent.setup();
    render(<ManagementPortal />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument());
    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "admin1234");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Dashboard metrics are currently unavailable.");
    expect(await screen.findByText("Dashboard unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Logout and session expiration (AUTH-009)
// ---------------------------------------------------------------------------

describe("Logout and session expiration", () => {
  test("signing out calls the logout API and returns to the login form with a confirmation notice", async () => {
    const api = makeApi([
      ...loggedOutRoutes(),
      { method: "GET", match: "/auth/csrf", handler: () => ({}) },
      { method: "POST", match: "/auth/login", handler: () => adminUser },
      { method: "POST", match: "/auth/logout", handler: () => ({}) },
      ...baseLoggedInRoutes({ user: adminUser, dashboard: adminDashboard() }),
    ]);
    createApiClient.mockReturnValue(api);
    const user = await signInAs({ api, username: "admin", password: "admin1234" });
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent("You have signed out.");
  });

  test("AUTH-009: a jafar:session-expired event clears the user and shows the login form with a notice", async () => {
    const api = makeApi([
      ...loggedOutRoutes(),
      { method: "GET", match: "/auth/csrf", handler: () => ({}) },
      { method: "POST", match: "/auth/login", handler: () => adminUser },
      ...baseLoggedInRoutes({ user: adminUser, dashboard: adminDashboard() }),
    ]);
    createApiClient.mockReturnValue(api);
    await signInAs({ api, username: "admin", password: "admin1234" });
    fireEvent(window, new Event("jafar:session-expired"));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent("Your session expired. Sign in again.");
  });
});

// ---------------------------------------------------------------------------
// Search / filter reset (SEARCH-008)
// ---------------------------------------------------------------------------

describe("Search and filter reset", () => {
  test("SEARCH-008: resetting the student search clears the query and reloads the full roster", async () => {
    const students = [{ id: 1, fullName: "Ahmed Mohammed", studentNumber: "STD-001", branchId: 1, guardianName: "Ali", teacherId: null }];
    const api = makeApi([
      ...loggedOutRoutes(),
      { method: "GET", match: "/auth/csrf", handler: () => ({}) },
      { method: "POST", match: "/auth/login", handler: () => adminUser },
      ...baseLoggedInRoutes({
        user: adminUser, dashboard: adminDashboard(),
        students: { content: students, totalElements: 1, totalPages: 1, number: 0, size: 10 },
        branches: [{ id: 1, name: "Al-Noor Branch", active: true }],
      }),
    ]);
    createApiClient.mockReturnValue(api);
    const user = await signInAs({ api, username: "admin", password: "admin1234" });
    await user.click(screen.getByRole("button", { name: "Students" }));
    await screen.findByRole("heading", { name: "Students", level: 1 });

    const searchInput = screen.getByPlaceholderText("Name, student number, guardian");
    await user.type(searchInput, "ahmed");
    expect(searchInput).toHaveValue("ahmed");

    const callsBeforeReset = api.calls.length;
    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(searchInput).toHaveValue("");
    await waitFor(() => expect(api.calls.length).toBeGreaterThan(callsBeforeReset));
    const searchCallsAfterReset = api.calls.slice(callsBeforeReset).filter(c => c.path.startsWith("/students/search"));
    expect(searchCallsAfterReset.length).toBeGreaterThan(0);
    expect(searchCallsAfterReset[searchCallsAfterReset.length - 1].path).not.toContain("q=");
  });
});

// ---------------------------------------------------------------------------
// Student management
// ---------------------------------------------------------------------------

describe("Student management", () => {
  test("register student form requires name, number, branch and enrollment date before saving", async () => {
    const api = makeApi([
      ...loggedOutRoutes(),
      { method: "GET", match: "/auth/csrf", handler: () => ({}) },
      { method: "POST", match: "/auth/login", handler: () => adminUser },
      ...baseLoggedInRoutes({ user: adminUser, dashboard: adminDashboard(), branches: [{ id: 1, name: "Al-Noor Branch", active: true }] }),
    ]);
    createApiClient.mockReturnValue(api);
    const user = await signInAs({ api, username: "admin", password: "admin1234" });
    await user.click(screen.getByRole("button", { name: "Students" }));
    await screen.findByRole("heading", { name: "Students", level: 1 });
    await user.click(screen.getByRole("button", { name: "Register student" }));

    const form = within(screen.getByRole("heading", { name: "Register student" }).closest("form"));
    expect(form.getByLabelText("Full name")).toBeRequired();
    expect(form.getByLabelText("Student number")).toBeRequired();
    expect(form.getByLabelText("Branch")).toBeRequired();
    expect(form.getByLabelText("Enrollment date")).toBeRequired();

    const callsBefore = api.calls.length;
    fireEvent.click(form.getByRole("button", { name: "Save student" }));
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(api.calls.filter(c => c.method === "POST" && c.path === "/students").length).toBe(0);
    expect(api.calls.length).toBe(callsBefore);
  });

  test("registering a student with a teacher assigned posts the selected branch and teacher", async () => {
    const teachers = [{ id: 9, username: "teacher1", branchId: 1, active: true }];
    const api = makeApi([
      ...loggedOutRoutes(),
      { method: "GET", match: "/auth/csrf", handler: () => ({}) },
      { method: "POST", match: "/auth/login", handler: () => adminUser },
      ...baseLoggedInRoutes({ user: adminUser, dashboard: adminDashboard(), branches: [{ id: 1, name: "Al-Noor Branch", active: true }], teachers }),
      { method: "POST", match: "/students", handler: () => ({ id: 5 }) },
    ]);
    createApiClient.mockReturnValue(api);
    const user = await signInAs({ api, username: "admin", password: "admin1234" });
    await user.click(screen.getByRole("button", { name: "Students" }));
    await screen.findByRole("heading", { name: "Students", level: 1 });
    await user.click(screen.getByRole("button", { name: "Register student" }));

    const form = within(screen.getByRole("heading", { name: "Register student" }).closest("form"));
    await user.type(form.getByLabelText("Full name"), "Fatima Hassan");
    await user.type(form.getByLabelText("Student number"), "STD-002");
    await user.selectOptions(form.getByLabelText("Branch"), "1");
    await user.selectOptions(form.getByLabelText("Teacher"), "9");
    fireEvent.change(form.getByLabelText("Enrollment date"), { target: { value: "2026-01-10" } });

    await user.click(form.getByRole("button", { name: "Save student" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Student registered."));
    const createCall = api.calls.find(c => c.method === "POST" && c.path === "/students");
    expect(createCall.options.body).toMatchObject({ fullName: "Fatima Hassan", studentNumber: "STD-002", branchId: 1, teacherId: 9 });
  });
});

// ---------------------------------------------------------------------------
// Student attendance recording
// ---------------------------------------------------------------------------

describe("Student attendance recording", () => {
  test("the attendance form offers all 4 statuses and surfaces a duplicate-record error from the API", async () => {
    const roster = [{ id: 1, fullName: "Ahmed Mohammed", studentNumber: "STD-001", branchId: 1 }];
    const api = makeApi([
      ...loggedOutRoutes(),
      { method: "GET", match: "/auth/csrf", handler: () => ({}) },
      { method: "POST", match: "/auth/login", handler: () => adminUser },
      ...baseLoggedInRoutes({
        user: adminUser, dashboard: adminDashboard(), branches: [{ id: 1, name: "Al-Noor Branch", active: true }],
        students: { content: roster, totalElements: 1, totalPages: 1, number: 0, size: 100 },
      }),
      { method: "GET", match: "/student-attendance", handler: () => emptyPage },
      { method: "POST", match: "/student-attendance", handler: () => ({ __throw: true, message: "Attendance has already been recorded for this student on this date.", status: 400 }) },
    ]);
    createApiClient.mockReturnValue(api);
    const user = await signInAs({ api, username: "admin", password: "admin1234" });
    await user.click(screen.getByRole("button", { name: "Student Attendance" }));
    await screen.findByRole("heading", { name: "Student Attendance" });
    await user.click(screen.getByRole("button", { name: "Record attendance" }));

    const form = within(screen.getByRole("heading", { name: "Record student attendance" }).closest("form"));
    const statusSelect = form.getByLabelText("Status");
    const statusOptions = Array.from(statusSelect.options).map(option => option.value);
    expect(statusOptions).toEqual(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);

    await user.selectOptions(form.getByLabelText("Student"), "1");
    await user.click(form.getByRole("button", { name: "Save attendance" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Attendance has already been recorded for this student on this date.");
  });
});

// ---------------------------------------------------------------------------
// Quran progress recording
// ---------------------------------------------------------------------------

describe("Quran progress recording", () => {
  test("the progress form offers all 6 activity types and 5 progress statuses", async () => {
    const api = makeApi([
      ...loggedOutRoutes(),
      { method: "GET", match: "/auth/csrf", handler: () => ({}) },
      { method: "POST", match: "/auth/login", handler: () => adminUser },
      ...baseLoggedInRoutes({ user: adminUser, dashboard: adminDashboard() }),
      { method: "GET", match: "/quran-progress", handler: () => emptyPage },
      { method: "GET", match: /^\/students\/search/, handler: () => emptyPage },
    ]);
    createApiClient.mockReturnValue(api);
    const user = await signInAs({ api, username: "admin", password: "admin1234" });
    await user.click(screen.getByRole("button", { name: "Quran Progress" }));
    await screen.findByRole("heading", { name: "Quran Progress" });
    await user.click(screen.getByRole("button", { name: "Record progress" }));

    const activitySelect = screen.getByLabelText("Activity");
    expect(Array.from(activitySelect.options).map(o => o.value)).toEqual(["NEW_LESSON", "RECITATION", "REVISION", "MEMORIZATION", "CORRECTION", "OTHER"]);
    const resultSelect = screen.getByLabelText("Result");
    expect(Array.from(resultSelect.options).map(o => o.value)).toEqual(["EXCELLENT", "GOOD", "SATISFACTORY", "NEEDS_IMPROVEMENT", "INCOMPLETE"]);
  });
});

// ---------------------------------------------------------------------------
// User account management (Administrator/Branch Manager/Quran Teacher creation)
// ---------------------------------------------------------------------------

describe("User account management", () => {
  const oneBranch = [{ id: 1, name: "Al-Noor Branch", active: true }];

  async function openAddUserForm() {
    const api = makeApi([
      ...loggedOutRoutes(),
      { method: "GET", match: "/auth/csrf", handler: () => ({}) },
      { method: "POST", match: "/auth/login", handler: () => adminUser },
      ...baseLoggedInRoutes({ user: adminUser, dashboard: adminDashboard(), branches: oneBranch }),
      { method: "POST", match: "/users", handler: () => ({ id: 10, username: "manager2", role: "BRANCH_MANAGER", branchId: 1, active: true }) },
    ]);
    createApiClient.mockReturnValue(api);
    const user = await signInAs({ api, username: "admin", password: "admin1234" });
    await user.click(screen.getByRole("button", { name: "Users" }));
    await screen.findByRole("heading", { name: "Users", level: 1 });
    await user.click(screen.getByRole("button", { name: "Add user" }));
    const form = within(screen.getByRole("heading", { name: "Create account" }).closest("form"));
    return { api, user, form };
  }

  test("Add user form defaults to Branch Manager, requires username/password/branch, and offers all three roles", async () => {
    const { form } = await openAddUserForm();

    expect(form.getByLabelText("Username")).toBeRequired();
    expect(form.getByLabelText("Initial password")).toBeRequired();
    expect(form.getByLabelText("Branch")).toBeRequired();
    expect(form.getByLabelText("Role").value).toBe("BRANCH_MANAGER");
    expect(Array.from(form.getByLabelText("Role").options).map(o => o.value)).toEqual(["ADMINISTRATOR", "BRANCH_MANAGER", "QURAN_TEACHER"]);
    expect(form.queryByLabelText("Status")).not.toBeInTheDocument();
  });

  test("creating a Branch Manager account posts the username, role, branch and password to POST /users", async () => {
    const { api, user, form } = await openAddUserForm();

    await user.type(form.getByLabelText("Username"), "manager2");
    await user.type(form.getByLabelText("Initial password"), "supersecret123");
    await user.selectOptions(form.getByLabelText("Branch"), "1");
    await user.type(form.getByLabelText("Full name"), "Second Manager");
    await user.click(form.getByRole("button", { name: "Save account" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("manager2 account created."));
    const createCall = api.calls.find(c => c.method === "POST" && c.path === "/users");
    expect(createCall.options.body).toMatchObject({ username: "manager2", role: "BRANCH_MANAGER", branchId: 1, password: "supersecret123", fullName: "Second Manager" });
  });

  test("switching the role to Administrator hides the branch field and omits branchId from the request", async () => {
    const { api, user, form } = await openAddUserForm();

    await user.selectOptions(form.getByLabelText("Role"), "ADMINISTRATOR");
    expect(form.queryByLabelText("Branch")).not.toBeInTheDocument();
    await user.type(form.getByLabelText("Username"), "admin2");
    await user.type(form.getByLabelText("Initial password"), "supersecret123");
    await user.click(form.getByRole("button", { name: "Save account" }));

    await waitFor(() => expect(api.calls.some(c => c.method === "POST" && c.path === "/users")).toBe(true));
    const createCall = api.calls.find(c => c.method === "POST" && c.path === "/users");
    expect(createCall.options.body).toMatchObject({ username: "admin2", role: "ADMINISTRATOR", branchId: null });
  });
});
