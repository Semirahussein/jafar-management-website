// Fixture data for NEXT_PUBLIC_DEMO_MODE. Mirrors the shapes the real
// backend returns closely enough for the portal UI to render normally
// with no backend connected.

export const DEMO_BRANCHES = [
  { id: 1, name: "Al-Noor Branch", address: "123 Main St, Addis Ababa", active: true },
  { id: 2, name: "Al-Furqan Branch", address: "45 Bole Road, Addis Ababa", active: true },
];

export const DEMO_USERS = [
  { id: 1, username: "admin", password: "demo", role: "ADMINISTRATOR", branchId: null, fullName: "Demo Administrator", email: "admin@example.com", phone: "", active: true },
  { id: 2, username: "manager", password: "demo", role: "BRANCH_MANAGER", branchId: 1, fullName: "Demo Branch Manager", email: "manager@example.com", phone: "", active: true },
  { id: 3, username: "teacher", password: "demo", role: "QURAN_TEACHER", branchId: 1, fullName: "Demo Quran Teacher", email: "teacher@example.com", phone: "", active: true },
  { id: 4, username: "teacher2", password: "demo", role: "QURAN_TEACHER", branchId: 2, fullName: "Second Demo Teacher", email: "", phone: "", active: true },
];

export const DEMO_STUDENTS = [
  { id: 1, fullName: "Ahmed Mohammed", studentNumber: "STD-001", gender: "MALE", branchId: 1, teacherId: 3, currentLevel: "Juz 5", enrollmentDate: "2026-01-10", guardianName: "Mohammed Ali", guardianPhone: "+251911000001" },
  { id: 2, fullName: "Fatima Hassan", studentNumber: "STD-002", gender: "FEMALE", branchId: 1, teacherId: 3, currentLevel: "Juz 2", enrollmentDate: "2026-02-15", guardianName: "Hassan Ibrahim", guardianPhone: "+251911000002" },
  { id: 3, fullName: "Bilal Yusuf", studentNumber: "STD-003", gender: "MALE", branchId: 2, teacherId: 4, currentLevel: "Juz 8", enrollmentDate: "2025-11-01", guardianName: "Yusuf Omar", guardianPhone: "+251911000003" },
  { id: 4, fullName: "Maryam Abdi", studentNumber: "STD-004", gender: "FEMALE", branchId: 2, teacherId: 4, currentLevel: "Juz 1", enrollmentDate: "2026-03-20", guardianName: "Abdi Nur", guardianPhone: "+251911000004" },
];

export function demoDashboardFor(user) {
  const todayStudentAttendance = { present: 7, absent: 1, late: 1, excused: 1, total: 10 };
  const todayTeacherAttendance = { present: 2, absent: 0, late: 0, excused: 0, total: 2 };
  const recentProgress = [
    { id: 1, date: "2026-11-15", studentId: 1, surahName: "Al-Baqarah", activityType: "MEMORIZATION", progressStatus: "EXCELLENT" },
    { id: 2, date: "2026-11-14", studentId: 2, surahName: "Al-Fatiha", activityType: "REVISION", progressStatus: "GOOD" },
  ];
  if (user.role === "ADMINISTRATOR") {
    return {
      totalBranches: DEMO_BRANCHES.length,
      totalStudents: DEMO_STUDENTS.length,
      totalTeachers: DEMO_USERS.filter(u => u.role === "QURAN_TEACHER").length,
      todayStudentAttendance, todayTeacherAttendance, recentProgress, pendingReports: 3,
    };
  }
  if (user.role === "BRANCH_MANAGER") {
    return {
      totalStudents: DEMO_STUDENTS.filter(s => s.branchId === user.branchId).length,
      totalTeachers: DEMO_USERS.filter(u => u.role === "QURAN_TEACHER" && u.branchId === user.branchId).length,
      todayStudentAttendance, todayTeacherAttendance, recentProgress, pendingReports: 1,
    };
  }
  return {
    assignedStudents: DEMO_STUDENTS.filter(s => s.teacherId === user.id).length,
    todayAttendance: todayStudentAttendance, recentProgress, pendingReports: 2,
  };
}

export function paginate(items, page = 0, size = 20) {
  const start = page * size;
  return {
    content: items.slice(start, start + size),
    totalElements: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / size)),
    number: page,
    size,
  };
}
