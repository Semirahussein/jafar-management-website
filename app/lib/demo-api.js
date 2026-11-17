// A self-contained, in-browser "fake backend" used when
// NEXT_PUBLIC_DEMO_MODE=true (no real backend deployed yet). It mimics the
// real API's paths, payload shapes, and the main validation/role-scoping
// rules closely enough that the whole portal works end to end against
// fixture data held in sessionStorage - nothing leaves the browser, and
// nothing here is ever reachable when demo mode is off.
import { ApiError } from "./api-error";
import { DEMO_BRANCHES, DEMO_USERS, DEMO_STUDENTS, demoDashboardFor, paginate } from "./demo-data";

const STORAGE_KEY = "jafar-demo-state-v1";
const SESSION_KEY = "jafar-demo-user-id";

function seedState() {
  return {
    branches: DEMO_BRANCHES.map(b => ({ ...b })),
    users: DEMO_USERS.map(u => ({ ...u })),
    students: DEMO_STUDENTS.map(s => ({ ...s })),
    studentAttendance: [],
    teacherAttendance: [],
    quranProgress: [],
    reports: [],
    notifications: [],
    notificationAttempts: [],
    nextId: { branch: 3, user: 5, student: 5, studentAttendance: 1, teacherAttendance: 1, quranProgress: 1, report: 1, notification: 1, attempt: 1 },
  };
}

function loadState() {
  if (typeof sessionStorage === "undefined") return seedState();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : seedState();
  } catch {
    return seedState();
  }
}

function saveState(state) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function nextId(state, kind) {
  const id = state.nextId[kind]++;
  return id;
}

function currentUser(state) {
  const id = typeof sessionStorage === "undefined" ? null : Number(sessionStorage.getItem(SESSION_KEY));
  return state.users.find(u => u.id === id) || null;
}

function requireUser(state) {
  const user = currentUser(state);
  if (!user) throw new ApiError("Unauthorized", 401);
  return user;
}

function sessionUserView(user) {
  return { id: user.id, username: user.username, role: user.role, branchId: user.branchId };
}

function userView(user) {
  const { password: _password, ...view } = user;
  return view;
}

function canAccessBranch(user, branchId) {
  return user.role === "ADMINISTRATOR" || Number(branchId) === Number(user.branchId);
}

function visibleBranches(state, user) {
  return user.role === "ADMINISTRATOR" ? state.branches : state.branches.filter(b => b.id === user.branchId);
}

function nowIso() {
  return new Date().toISOString();
}

function parsePage(query) {
  return { page: Number(query.get("page") ?? 0), size: Number(query.get("size") ?? 20) };
}

function matchesText(haystack, needle) {
  return !needle || (haystack || "").toLowerCase().includes(needle.trim().toLowerCase());
}

function pathParts(base) {
  return base.split("/").filter(Boolean);
}

export async function demoRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const [base, search = ""] = path.split("?");
  const query = new URLSearchParams(search);
  const parts = pathParts(base);
  const body = options.body ? JSON.parse(JSON.stringify(options.body)) : null;
  const state = loadState();

  try {
    const result = await route(method, parts, query, body, options.headers || {}, state);
    saveState(state);
    return result;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && !["auth"].includes(parts[0]) && typeof window !== "undefined") {
      window.dispatchEvent(new Event("jafar:session-expired"));
    }
    throw error;
  }
}

async function route(method, parts, query, body, headers, state) {
  const [resource, a, b] = parts;

  // ---- auth ----
  if (resource === "auth") {
    if (a === "csrf" && method === "GET") return { token: "demo-csrf-token" };
    if (a === "login" && method === "POST") {
      const username = (body.username || "").trim().toLowerCase();
      const match = state.users.find(u => u.username.toLowerCase() === username);
      if (!match || match.password !== body.password) {
        throw new ApiError("The username or password is incorrect.", 401);
      }
      if (!match.active) throw new ApiError("This account is inactive. Contact an administrator.", 401);
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem(SESSION_KEY, String(match.id));
      return sessionUserView(match);
    }
    if (a === "me" && method === "GET") return sessionUserView(requireUser(state));
    if (a === "logout" && method === "POST") {
      if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  const user = requireUser(state);

  // ---- dashboard ----
  if (resource === "dashboard" && method === "GET") return demoDashboardFor(user);

  // ---- branches ----
  if (resource === "branches") {
    if (!a && method === "GET") return visibleBranches(state, user);
    if (a === "search" && method === "GET") {
      const { page, size } = parsePage(query);
      const q = query.get("q");
      const active = query.get("active");
      let rows = visibleBranches(state, user);
      if (q) rows = rows.filter(b => matchesText(b.name, q) || matchesText(b.address, q));
      if (active) rows = rows.filter(b => String(b.active) === active);
      return paginate(rows, page, size);
    }
    if (!a && method === "POST") {
      if (state.branches.some(b => b.name.toLowerCase() === body.name.trim().toLowerCase())) {
        throw new ApiError("A branch with this name already exists", 409);
      }
      const branch = { id: nextId(state, "branch"), name: body.name.trim(), address: body.address || null, active: body.active ?? true };
      state.branches.push(branch);
      return branch;
    }
    if (a && method === "PUT") {
      const branch = state.branches.find(x => x.id === Number(a));
      if (!branch) throw new ApiError("Branch not found", 404);
      if (!canAccessBranch(user, branch.id)) throw new ApiError("You cannot access this branch", 403);
      Object.assign(branch, { name: body.name.trim(), address: body.address || null, active: body.active ?? branch.active });
      return branch;
    }
    if (a && method === "DELETE") {
      const hasRecords = [...state.students, ...state.studentAttendance, ...state.teacherAttendance].some(r => r.branchId === Number(a));
      if (hasRecords) throw new ApiError("Branch has assigned users, students, or historical records and cannot be deleted", 409);
      state.branches = state.branches.filter(x => x.id !== Number(a));
      return null;
    }
  }

  // ---- users ----
  if (resource === "users") {
    if (a === "search" && method === "GET") {
      const { page, size } = parsePage(query);
      let rows = state.users;
      if (query.get("q")) rows = rows.filter(u => matchesText(u.username, query.get("q")) || matchesText(u.fullName, query.get("q")));
      if (query.get("role")) rows = rows.filter(u => u.role === query.get("role"));
      if (query.get("active")) rows = rows.filter(u => String(u.active) === query.get("active"));
      return paginate(rows.map(userView), page, size);
    }
    if (a === "teachers" && b === "search" && method === "GET") {
      const { page, size } = parsePage(query);
      let rows = state.users.filter(u => u.role === "QURAN_TEACHER");
      if (user.role === "BRANCH_MANAGER") rows = rows.filter(u => u.branchId === user.branchId);
      else if (query.get("branchId")) rows = rows.filter(u => u.branchId === Number(query.get("branchId")));
      if (query.get("q")) rows = rows.filter(u => matchesText(u.username, query.get("q")) || matchesText(u.fullName, query.get("q")));
      if (query.get("active")) rows = rows.filter(u => String(u.active) === query.get("active"));
      return paginate(rows.map(userView), page, size);
    }
    if (a === "teachers" && b && method === "GET") {
      const teacher = state.users.find(u => u.id === Number(b) && u.role === "QURAN_TEACHER");
      if (!teacher) throw new ApiError("Teacher not found", 404);
      return userView(teacher);
    }
    if (!a && method === "POST") {
      if (state.users.some(u => u.username.toLowerCase() === body.username.trim().toLowerCase())) {
        throw new ApiError("Username is already in use", 409);
      }
      const created = { id: nextId(state, "user"), username: body.username.trim(), password: body.password, role: body.role,
        branchId: body.role === "ADMINISTRATOR" ? null : (body.branchId ?? null),
        fullName: body.fullName || "", email: body.email || "", phone: body.phone || "", active: true };
      state.users.push(created);
      return userView(created);
    }
    if (a && method === "PUT") {
      const target = state.users.find(u => u.id === Number(a));
      if (!target) throw new ApiError("User not found", 404);
      Object.assign(target, {
        username: body.username ?? target.username, role: body.role ?? target.role,
        branchId: (body.role ?? target.role) === "ADMINISTRATOR" ? null : (body.branchId ?? target.branchId),
        fullName: body.fullName ?? target.fullName, email: body.email ?? target.email, phone: body.phone ?? target.phone,
        active: body.active ?? target.active,
      });
      if (body.password) target.password = body.password;
      return userView(target);
    }
  }

  // ---- students ----
  if (resource === "students") {
    if (a === "search" && method === "GET") {
      const { page, size } = parsePage(query);
      let rows = state.students;
      if (user.role === "BRANCH_MANAGER") rows = rows.filter(s => s.branchId === user.branchId);
      if (user.role === "QURAN_TEACHER") rows = rows.filter(s => s.teacherId === user.id);
      if (query.get("branchId")) rows = rows.filter(s => s.branchId === Number(query.get("branchId")));
      if (query.get("teacherId")) rows = rows.filter(s => s.teacherId === Number(query.get("teacherId")));
      if (query.get("q")) rows = rows.filter(s => matchesText(s.fullName, query.get("q")) || matchesText(s.studentNumber, query.get("q")));
      return paginate(rows, page, size);
    }
    if (a && !b && method === "GET") {
      const student = state.students.find(s => s.id === Number(a));
      if (!student) throw new ApiError("Student not found", 404);
      return student;
    }
    if (!a && method === "POST") {
      if (state.students.some(s => s.studentNumber === body.studentNumber)) {
        throw new ApiError("Student number is already in use", 422);
      }
      if (user.role === "BRANCH_MANAGER" && !canAccessBranch(user, body.branchId)) {
        throw new ApiError("You cannot manage students outside your assigned branches", 403);
      }
      const student = { id: nextId(state, "student"), ...body };
      state.students.push(student);
      return student;
    }
    if (a && method === "PUT") {
      const student = state.students.find(s => s.id === Number(a));
      if (!student) throw new ApiError("Student not found", 404);
      Object.assign(student, body);
      return student;
    }
    if (a && method === "DELETE") {
      const hasHistory = [...state.studentAttendance, ...state.quranProgress, ...state.notifications].some(r => r.studentId === Number(a));
      if (hasHistory) throw new ApiError("Cannot delete student with recorded attendance, progress, or notifications", 409);
      state.students = state.students.filter(s => s.id !== Number(a));
      return null;
    }
  }

  // ---- student attendance ----
  if (resource === "student-attendance") {
    if (!a && method === "GET") {
      const { page, size } = parsePage(query);
      let rows = state.studentAttendance;
      if (user.role === "BRANCH_MANAGER") rows = rows.filter(r => r.branchId === user.branchId);
      if (user.role === "QURAN_TEACHER") rows = rows.filter(r => r.teacherId === user.id);
      if (query.get("studentId")) rows = rows.filter(r => r.studentId === Number(query.get("studentId")));
      if (query.get("status")) rows = rows.filter(r => r.status === query.get("status"));
      if (query.get("startDate")) rows = rows.filter(r => r.date >= query.get("startDate"));
      if (query.get("endDate")) rows = rows.filter(r => r.date <= query.get("endDate"));
      return paginate(rows, page, size);
    }
    if (!a && method === "POST") {
      const student = state.students.find(s => s.id === Number(body.studentId));
      if (state.studentAttendance.some(r => r.studentId === Number(body.studentId) && r.date === body.date)) {
        throw new ApiError("Attendance for this date already recorded", 409);
      }
      const record = { id: nextId(state, "studentAttendance"), studentId: Number(body.studentId), teacherId: student?.teacherId ?? null,
        branchId: student?.branchId ?? user.branchId, recordedById: user.id, date: body.date, status: body.status, remarks: body.remarks || null };
      state.studentAttendance.push(record);
      return record;
    }
    if (a && method === "PUT") {
      const record = state.studentAttendance.find(r => r.id === Number(a));
      if (!record) throw new ApiError("Attendance record not found", 404);
      Object.assign(record, { status: body.status ?? record.status, remarks: body.remarks ?? record.remarks });
      return record;
    }
  }

  // ---- teacher attendance ----
  if (resource === "teacher-attendance") {
    if (!a && method === "GET") {
      const { page, size } = parsePage(query);
      let rows = state.teacherAttendance;
      if (user.role === "BRANCH_MANAGER") rows = rows.filter(r => r.branchId === user.branchId);
      if (query.get("teacherId")) rows = rows.filter(r => r.teacherId === Number(query.get("teacherId")));
      if (query.get("status")) rows = rows.filter(r => r.status === query.get("status"));
      return paginate(rows, page, size);
    }
    if (!a && method === "POST") {
      const teacher = state.users.find(u => u.id === Number(body.teacherId));
      if (state.teacherAttendance.some(r => r.teacherId === Number(body.teacherId) && r.date === body.date)) {
        throw new ApiError("Attendance for this date already recorded", 409);
      }
      const record = { id: nextId(state, "teacherAttendance"), teacherId: Number(body.teacherId), branchId: teacher?.branchId ?? user.branchId,
        recordedById: user.id, date: body.date, status: body.status, remarks: body.remarks || null };
      state.teacherAttendance.push(record);
      return record;
    }
    if (a && method === "PUT") {
      const record = state.teacherAttendance.find(r => r.id === Number(a));
      if (!record) throw new ApiError("Attendance record not found", 404);
      Object.assign(record, { status: body.status ?? record.status, remarks: body.remarks ?? record.remarks });
      return record;
    }
  }

  // ---- quran progress ----
  if (resource === "quran-progress") {
    if (!a && method === "GET") {
      const { page, size } = parsePage(query);
      let rows = state.quranProgress;
      if (user.role === "BRANCH_MANAGER") rows = rows.filter(r => r.branchId === user.branchId);
      if (user.role === "QURAN_TEACHER") rows = rows.filter(r => r.teacherId === user.id);
      if (query.get("studentId")) rows = rows.filter(r => r.studentId === Number(query.get("studentId")));
      if (query.get("surahName")) rows = rows.filter(r => matchesText(r.surahName, query.get("surahName")));
      return paginate(rows, page, size);
    }
    if (!a && method === "POST") {
      const student = state.students.find(s => s.id === Number(body.studentId));
      const record = { id: nextId(state, "quranProgress"), ...body, studentId: Number(body.studentId),
        teacherId: user.role === "QURAN_TEACHER" ? user.id : (student?.teacherId ?? null), branchId: student?.branchId ?? user.branchId, date: body.date || nowIso().slice(0, 10) };
      state.quranProgress.push(record);
      return record;
    }
    if (a && method === "PUT") {
      const record = state.quranProgress.find(r => r.id === Number(a));
      if (!record) throw new ApiError("Progress record not found", 404);
      Object.assign(record, body);
      return record;
    }
  }

  // ---- reports ----
  if (resource === "reports") {
    if (a === "analytics" && method === "GET") return {};
    if (a === "export") throw new ApiError("Report export isn't available in this frontend-only demo.", 400);
    if (!a && method === "GET") {
      const { page, size } = parsePage(query);
      let rows = state.reports;
      if (user.role === "QURAN_TEACHER") rows = rows.filter(r => r.authorId === user.id);
      else if (user.role === "BRANCH_MANAGER") rows = rows.filter(r => r.branchId === user.branchId);
      if (query.get("type")) rows = rows.filter(r => r.reportType === query.get("type"));
      if (query.get("status")) rows = rows.filter(r => r.status === query.get("status"));
      return paginate(rows, page, size);
    }
    if (!a && method === "POST") {
      const report = { id: nextId(state, "report"), ...body, authorId: user.id, branchId: user.branchId,
        status: "DRAFT", createdAt: nowIso(), submittedAt: null, reviewedAt: null, reviewedById: null, reviewRemarks: null };
      state.reports.push(report);
      return report;
    }
    if (a && b === "submit" && method === "PUT") {
      const report = state.reports.find(r => r.id === Number(a));
      if (!report) throw new ApiError("Report not found", 404);
      if (report.status !== "DRAFT") throw new ApiError("Only draft reports can be submitted", 400);
      report.status = "SUBMITTED"; report.submittedAt = nowIso();
      return report;
    }
    if (a && b === "review" && method === "PUT") {
      const report = state.reports.find(r => r.id === Number(a));
      if (!report) throw new ApiError("Report not found", 404);
      report.status = "REVIEWED"; report.reviewedAt = nowIso(); report.reviewedById = user.id; report.reviewRemarks = body.reviewRemarks || null;
      return report;
    }
    if (a && !b && method === "PUT") {
      const report = state.reports.find(r => r.id === Number(a));
      if (!report) throw new ApiError("Report not found", 404);
      if (report.status !== "DRAFT") throw new ApiError("Only draft reports can be modified", 400);
      Object.assign(report, body);
      return report;
    }
    if (a && method === "DELETE") {
      state.reports = state.reports.filter(r => r.id !== Number(a));
      return null;
    }
  }

  // ---- notifications ----
  if (resource === "notifications") {
    if (!a && method === "GET") {
      const { page, size } = parsePage(query);
      let rows = state.notifications;
      if (user.role !== "ADMINISTRATOR") rows = rows.filter(n => n.branchId === user.branchId);
      if (query.get("status")) rows = rows.filter(n => n.deliveryStatus === query.get("status"));
      if (query.get("studentId")) rows = rows.filter(n => n.studentId === Number(query.get("studentId")));
      return paginate(rows, page, size);
    }
    if (!a && method === "POST") {
      const idempotencyKey = headers["Idempotency-Key"];
      const existing = idempotencyKey && state.notifications.find(n => n.idempotencyKey === idempotencyKey);
      if (existing) return existing;
      const student = state.students.find(s => s.id === Number(body.studentId));
      if (!student?.guardianName || !student?.guardianPhone) {
        throw new ApiError("Select a student with a saved guardian name and contact number", 422);
      }
      const notification = { id: nextId(state, "notification"), ...body, idempotencyKey, branchId: student.branchId,
        createdById: user.id, studentName: student.fullName, parentName: student.guardianName, parentContact: student.guardianPhone,
        deliveryStatus: "PENDING", attemptCount: 0, createdAt: nowIso(), sentAt: null, deliveredAt: null, failureReason: null };
      state.notifications.push(notification);
      return notification;
    }
    if (a && b === "send" && method === "PUT") {
      const notification = state.notifications.find(n => n.id === Number(a));
      if (!notification) throw new ApiError("Notification not found", 404);
      notification.deliveryStatus = "DELIVERED"; notification.sentAt = nowIso(); notification.deliveredAt = nowIso(); notification.attemptCount += 1;
      state.notificationAttempts.push({ id: nextId(state, "attempt"), notificationId: notification.id, attemptNumber: notification.attemptCount,
        attemptedAt: nowIso(), status: "DELIVERED", channel: "SMS" });
      return notification;
    }
    if (a && b === "attempts" && method === "GET") {
      return state.notificationAttempts.filter(att => att.notificationId === Number(a));
    }
    if (a && !b && method === "GET") {
      const notification = state.notifications.find(n => n.id === Number(a));
      if (!notification) throw new ApiError("Notification not found", 404);
      return notification;
    }
    if (a && method === "DELETE") {
      state.notifications = state.notifications.filter(n => n.id !== Number(a));
      return null;
    }
  }

  // Anything else: a safe, honest fallback rather than a crash.
  if (method === "GET") return paginate([], parsePage(query).page, parsePage(query).size);
  throw new ApiError("This action isn't available in the frontend-only demo.", 400);
}
