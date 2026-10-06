"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import "../dashboard/dashboard.css";
import "./students.css";

const teacher = {
  name: "Aisha Mohammed",
  branch: "Jafar Madrasa - Main Branch",
};

const assignedStudents = [
  { id: 1, name: "Aisha Ahmed", level: "Level 1" },
  { id: 2, name: "Maryam Ali", level: "Level 1" },
  { id: 3, name: "Yusuf Mohammed", level: "Level 2" },
  { id: 4, name: "Fatima Hassan", level: "Level 2" },
  { id: 5, name: "Abdullah Omar", level: "Level 3" },
];

function subscribeToLocalStorage(callback) {
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener("storage", callback);
  };
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getTodayAttendance(savedAttendance) {
  if (!savedAttendance) {
    return null;
  }

  try {
    const attendance = JSON.parse(savedAttendance);
    if (
      attendance?.date === getToday() &&
      Array.isArray(attendance.students)
    ) {
      return attendance.students;
    }
  } catch (error) {
    console.error("Unable to load saved attendance.", error);
  }

  return null;
}

function getLatestProgressByStudent(savedProgress) {
  if (!savedProgress) {
    return {};
  }

  try {
    const records = JSON.parse(savedProgress);
    if (!Array.isArray(records)) {
      throw new Error("Saved Quran progress must be an array.");
    }

    return records.reduce((latestByStudent, record) => {
      if (
        record &&
        record.studentId !== undefined &&
        record.surah &&
        record.ayahTo
      ) {
        const current = latestByStudent[record.studentId];
        if (!current || String(record.date) >= String(current.date)) {
          latestByStudent[record.studentId] = record;
        }
      }
      return latestByStudent;
    }, {});
  } catch (error) {
    console.error("Unable to load saved Quran progress.", error);
    return {};
  }
}

function formatRecordDate(date) {
  if (!date) {
    return "";
  }

  const parsedDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TeacherStudentsPage() {
  const savedAttendance = useSyncExternalStore(
    subscribeToLocalStorage,
    () => window.localStorage.getItem("todayAttendance"),
    () => null
  );
  const savedProgress = useSyncExternalStore(
    subscribeToLocalStorage,
    () => window.localStorage.getItem("quranProgress"),
    () => null
  );
  const todayAttendance = getTodayAttendance(savedAttendance);
  const latestProgress = getLatestProgressByStudent(savedProgress);
  const students = useMemo(
    () =>
      assignedStudents.map((student) => ({
        ...student,
        attendance: todayAttendance?.find(
          (entry) => Number(entry.id) === student.id
        )?.attendance,
        progress: latestProgress[student.id],
      })),
    [todayAttendance, latestProgress]
  );
  const presentCount = students.filter(
    (student) => student.attendance?.toLowerCase() === "present"
  ).length;
  const progressCount = students.filter((student) => student.progress).length;

  return (
    <div className="teacher-dashboard">
      <aside className="teacher-sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">JM</div>
          <div>
            <h2>Jafar Madrasa</h2>
            <span>Management</span>
          </div>
        </div>

        <nav className="sidebar-navigation" aria-label="Teacher navigation">
          <Link href="/management/teacher/dashboard" className="sidebar-link">
            <span aria-hidden="true">⌂</span>
            Dashboard
          </Link>
          <Link
            href="/management/teacher/students"
            className="sidebar-link active"
            aria-current="page"
          >
            <span aria-hidden="true">♙</span>
            Students
          </Link>
          <Link href="/management/teacher/attendance" className="sidebar-link">
            <span aria-hidden="true">✓</span>
            Attendance
          </Link>
          <Link href="/management/teacher/progress" className="sidebar-link">
            <span aria-hidden="true">▤</span>
            Quran Progress
          </Link>
          <Link href="/management/teacher/reports" className="sidebar-link">
            <span aria-hidden="true">▥</span>
            Reports
          </Link>
        </nav>

        <div className="sidebar-bottom">
          <Link href="/management/teacher/settings" className="sidebar-link">
            <span aria-hidden="true">⚙</span>
            Settings
          </Link>
          <button className="logout-button" type="button">
            <span aria-hidden="true">↪</span>
            Logout
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="mobile-brand">Jafar Madrasa</div>
          <div className="header-actions">
            <div className="teacher-profile">
              <div className="teacher-avatar" aria-hidden="true">AM</div>
              <div className="teacher-profile-info">
                <strong>{teacher.name}</strong>
                <span>Teacher</span>
              </div>
            </div>
          </div>
        </header>

        <div className="dashboard-content teacher-students-content">
          <section className="welcome-section">
            <div>
              <p className="dashboard-label">STUDENT OVERVIEW</p>
              <h1>My Students</h1>
              <p>Review your assigned students, today&apos;s attendance, and latest Quran progress.</p>
            </div>
            <span className="branch-badge">{teacher.branch}</span>
          </section>

          <section className="teacher-student-stats" aria-label="Student summary">
            <article className="teacher-student-stat">
              <span>Assigned students</span>
              <strong>{students.length}</strong>
            </article>
            <article className="teacher-student-stat">
              <span>Present today</span>
              <strong>{todayAttendance ? presentCount : "—"}</strong>
              <small>{todayAttendance ? "Attendance recorded" : "Attendance not taken"}</small>
            </article>
            <article className="teacher-student-stat">
              <span>Progress recorded</span>
              <strong>{progressCount}</strong>
              <small>Students with Quran progress</small>
            </article>
          </section>

          <section className="teacher-students-panel" aria-labelledby="teacher-students-heading">
            <div className="teacher-students-panel-heading">
              <div>
                <h2 id="teacher-students-heading">All students</h2>
                <p>Today&apos;s attendance and each student&apos;s latest recorded progress.</p>
              </div>
              <Link href="/management/teacher/dashboard" className="teacher-students-back">
                Back to dashboard
              </Link>
            </div>

            {students.length ? (
              <div className="teacher-students-table-scroll">
                <table className="teacher-students-table">
                  <thead>
                    <tr>
                      <th scope="col">Student</th>
                      <th scope="col">Level</th>
                      <th scope="col">Today&apos;s attendance</th>
                      <th scope="col">Latest Quran progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td data-label="Student">
                          <div className="teacher-student-identity">
                            <span className="teacher-student-avatar" aria-hidden="true">
                              {student.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                            </span>
                            <strong>{student.name}</strong>
                          </div>
                        </td>
                        <td data-label="Level">{student.level}</td>
                        <td data-label="Today’s attendance">
                          {student.attendance ? (
                            <span className={`teacher-student-attendance ${student.attendance.toLowerCase()}`}>
                              {student.attendance.charAt(0).toUpperCase() + student.attendance.slice(1)}
                            </span>
                          ) : (
                            <span className="teacher-student-not-recorded">
                              {todayAttendance ? "Not marked" : "Not taken"}
                            </span>
                          )}
                        </td>
                        <td data-label="Latest Quran progress">
                          {student.progress ? (
                            <div className="teacher-student-progress">
                              <strong>{student.progress.surah}, Ayah {student.progress.ayahTo}</strong>
                              {student.progress.ayahFrom && (
                                <span>Ayah range {student.progress.ayahFrom}–{student.progress.ayahTo}</span>
                              )}
                              {student.progress.date && (
                                <small>{formatRecordDate(student.progress.date)}</small>
                              )}
                              {student.progress.remark && (
                                <p>{student.progress.remark}</p>
                              )}
                            </div>
                          ) : (
                            <span className="teacher-student-not-recorded">Not recorded</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="teacher-students-empty">No students are assigned to your class yet.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
