"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiRequest } from "@/app/lib/api";
import { useAuth } from "../../auth-provider";
import "../dashboard/dashboard.css";
import "./students.css";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate() {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

export default function AdminStudentsPage() {
  const router = useRouter();
  const { credentials, signOut, user } = useAuth();
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [targetTeacherId, setTargetTeacherId] = useState("");
  const [editError, setEditError] = useState("");
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  useEffect(() => {
    if (!credentials || !user) {
      router.replace("/management/login");
      return;
    }

    if (user.role !== "ADMINISTRATOR") return;

    let active = true;
    Promise.all([
      apiRequest("/api/students", { auth: credentials }),
      apiRequest("/api/branches", { auth: credentials }),
      apiRequest("/api/users", { auth: credentials }),
    ])
      .then(([studentList, branchList, userList]) => {
        if (
          !Array.isArray(studentList) ||
          !Array.isArray(branchList) ||
          !Array.isArray(userList)
        ) {
          throw new Error("The backend returned an unexpected student directory response.");
        }
        if (!active) return;
        setStudents(studentList);
        setBranches(branchList);
        setTeachers(
          userList.filter(
            (candidate) =>
              candidate.role === "QURAN_TEACHER" && candidate.active
          )
        );
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(
          error instanceof ApiError && error.status === 401
            ? "Your sign-in is no longer valid. Sign in again."
            : error instanceof Error
              ? error.message
              : "Unable to load students from the backend."
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [credentials, router, user]);

  const branchById = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch.name])),
    [branches]
  );
  const teacherById = useMemo(
    () => new Map(teachers.map((teacher) => [teacher.id, teacher.username])),
    [teachers]
  );
  const assignedStudents = students.filter((student) => student.teacherId).length;
  const accessError =
    user && user.role !== "ADMINISTRATOR"
      ? "Only administrators can view this student directory."
      : "";

  const saveTeacherAssignment = async (event, student) => {
    event.preventDefault();
    setEditError("");

    if (!credentials || !targetTeacherId) {
      setEditError("Choose a teacher before saving.");
      return;
    }

    const newTeacherId = Number(targetTeacherId);
    if (
      !teachers.some(
        (teacher) =>
          teacher.id === newTeacherId && teacher.branchId === student.branchId
      )
    ) {
      setEditError("The teacher must belong to this student's branch.");
      return;
    }

    setIsSavingAssignment(true);
    try {
      const updatedStudent = await apiRequest(`/api/students/${student.id}`, {
        method: "PUT",
        auth: credentials,
        body: {
          fullName: student.fullName,
          studentNumber: student.studentNumber,
          gender: student.gender,
          dateOfBirth: student.dateOfBirth,
          guardianName: student.guardianName,
          guardianPhone: student.guardianPhone,
          branchId: student.branchId,
          teacherId: newTeacherId,
          enrollmentDate: student.enrollmentDate,
          currentLevel: student.currentLevel,
        },
      });
      setStudents((currentStudents) =>
        currentStudents.map((current) =>
          current.id === updatedStudent.id ? updatedStudent : current
        )
      );
      setEditingStudentId(null);
      setTargetTeacherId("");
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Unable to update the teacher assignment."
      );
    } finally {
      setIsSavingAssignment(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/management/admin/dashboard">
          <span className="admin-brand-mark">JM</span>
          <span className="admin-brand-text">
            <strong>Jafar Madrasa</strong>
            <small>Branch management</small>
          </span>
        </Link>
        <div className="admin-sidebar-label">WORKSPACE</div>
        <nav className="admin-navigation" aria-label="Admin navigation">
          <Link href="/management/admin/dashboard" className="admin-nav-link">
            <span className="admin-nav-icon" aria-hidden="true">⌂</span>
            Dashboard
          </Link>
          <Link
            href="/management/admin/students"
            className="admin-nav-link active"
            aria-current="page"
          >
            <span className="admin-nav-icon" aria-hidden="true">♙</span>
            Students
          </Link>
          <Link href="/management/admin/branches" className="admin-nav-link">
            <span className="admin-nav-icon" aria-hidden="true">▦</span>
            Branches
          </Link>
          <Link href="/management/admin/teachers" className="admin-nav-link">
            <span className="admin-nav-icon" aria-hidden="true">♧</span>
            Teachers
          </Link>
          <Link href="/management/admin/assignments" className="admin-nav-link">
            <span className="admin-nav-icon" aria-hidden="true">⇄</span>
            Assignments
          </Link>
          <Link href="/management/admin/attendance" className="admin-nav-link">
            <span className="admin-nav-icon" aria-hidden="true">✓</span>
            Teacher Attendance
          </Link>
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-branch-avatar" aria-hidden="true">AD</div>
          <div>
            <strong>{user?.username || "Administrator"}</strong>
            <span>Administrator</span>
          </div>
        </div>
        <Link
          className="admin-logout-link"
          href="/management/login"
          onClick={signOut}
        >
          <span className="admin-nav-icon" aria-hidden="true">↪</span>
          Logout
        </Link>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-mobile-brand">
            <span className="admin-brand-mark">JM</span>
            <strong>Jafar Madrasa</strong>
          </div>
          <div className="admin-topbar-date">{getFormattedDate()}</div>
          <div className="admin-user">
            <div className="admin-user-avatar">AD</div>
            <div className="admin-user-details">
              <strong>{user?.username || "Administrator"}</strong>
              <span>Administrator</span>
            </div>
          </div>
        </header>

        <div className="admin-content">
          <section className="admin-welcome">
            <div>
              <p className="admin-eyebrow">STUDENT OVERVIEW</p>
              <h1>{getGreeting()}, {user?.username || "Admin"}</h1>
              <p>Students below are loaded from the management database.</p>
            </div>
            <Link
              className="admin-register-student-button"
              href="/management/admin/students/register"
            >
              + Register student
            </Link>
          </section>

          <section className="admin-student-summary" aria-label="Student totals">
            <article className="admin-stat-card">
              <div className="admin-stat-heading">
                <span>Total students</span>
                <span className="admin-stat-icon students">♙</span>
              </div>
              <strong>{isLoading ? "…" : students.length}</strong>
              <p>Loaded from the backend</p>
            </article>
            <article className="admin-stat-card">
              <div className="admin-stat-heading">
                <span>Assigned to a teacher</span>
                <span className="admin-stat-icon teachers">♧</span>
              </div>
              <strong>{isLoading ? "…" : assignedStudents}</strong>
              <p>Students with a Quran teacher</p>
            </article>
          </section>

          <section className="admin-panel teacher-students-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>Student directory</h2>
                <p>Official student records from the backend.</p>
              </div>
              {!isLoading && !loadError && (
                <span className="admin-table-caption">{students.length} students</span>
              )}
            </div>

            {accessError ? (
              <p className="register-student-error" role="alert">{accessError}</p>
            ) : isLoading ? (
              <p role="status">Loading students…</p>
            ) : loadError ? (
              <p className="register-student-error" role="alert">{loadError}</p>
            ) : students.length === 0 ? (
              <p role="status">No students are registered yet. Use “Register student” to add the first one.</p>
            ) : (
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Student number</th>
                      <th>Branch</th>
                      <th>Teacher</th>
                      <th>Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td>{student.fullName}</td>
                        <td>{student.studentNumber}</td>
                        <td>{branchById.get(student.branchId) || `Branch ${student.branchId}`}</td>
                        <td>
                          {editingStudentId === student.id ? (
                            <form
                              className="student-assignment-form"
                              onSubmit={(event) => saveTeacherAssignment(event, student)}
                            >
                              <label className="visually-hidden" htmlFor={`teacher-${student.id}`}>
                                Assign teacher to {student.fullName}
                              </label>
                              <select
                                id={`teacher-${student.id}`}
                                value={targetTeacherId}
                                onChange={(event) => setTargetTeacherId(event.target.value)}
                                required
                              >
                                <option value="" disabled>Select teacher</option>
                                {teachers
                                  .filter(
                                    (teacher) =>
                                      teacher.branchId === student.branchId &&
                                      teacher.id !== student.teacherId
                                  )
                                  .map((teacher) => (
                                    <option key={teacher.id} value={teacher.id}>
                                      {teacher.username}
                                    </option>
                                  ))}
                              </select>
                              <button type="submit" disabled={isSavingAssignment}>
                                {isSavingAssignment ? "Saving…" : "Save"}
                              </button>
                              <button
                                type="button"
                                disabled={isSavingAssignment}
                                onClick={() => {
                                  setEditingStudentId(null);
                                  setEditError("");
                                }}
                              >
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <>
                              {student.teacherId
                                ? teacherById.get(student.teacherId) || `Teacher ${student.teacherId}`
                                : "Not assigned"}
                              {teachers.some(
                                (teacher) =>
                                  teacher.branchId === student.branchId &&
                                  teacher.id !== student.teacherId
                              ) && (
                                <button
                                  type="button"
                                  className="student-assignment-edit"
                                  onClick={() => {
                                    setEditingStudentId(student.id);
                                    setTargetTeacherId("");
                                    setEditError("");
                                  }}
                                >
                                  Change
                                </button>
                              )}
                            </>
                          )}
                        </td>
                        <td>{student.currentLevel || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {editError && <p className="register-student-error" role="alert">{editError}</p>}
          </section>

          <footer className="admin-footer">
            <span>Jafar Madrasa Management</span>
            <span>Student data is served by the backend API</span>
          </footer>
        </div>
      </main>
    </div>
  );
}


