"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import "./dashboard.css";
import {
  getServerStudentRosterSnapshot,
  getStudentRoster,
  getStudentRosterSnapshot,
  subscribeToStudentRoster,
} from "../students/studentRoster";
import {
  getServerTeacherAttendanceSnapshot,
  getTodayTeacherStatuses,
  getTeacherAttendanceSnapshot,
  saveTodayTeacherStatuses,
  subscribeToTeacherAttendance,
} from "../attendance/teacherAttendance";

const branch = "Jafar Madrasa - Main Branch";

const recentReports = [
  {
    id: 1,
    teacher: "Fatima Ahmed",
    title: "Weekly student progress",
    detail: "Shared progress notes for 12 assigned students",
    time: "Today, 8:35 AM",
    type: "Progress",
  },
  {
    id: 2,
    teacher: "Musa Ibrahim",
    title: "Class attendance submitted",
    detail: "Attendance recorded for 9 students",
    time: "Today, 8:10 AM",
    type: "Attendance",
  },
  {
    id: 3,
    teacher: "Khadija Hassan",
    title: "Student follow-up requested",
    detail: "One student may need additional revision support",
    time: "Yesterday, 2:45 PM",
    type: "Follow-up",
  },
];

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

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

export default function AdminDashboardPage() {
  const rosterSnapshot = useSyncExternalStore(
    subscribeToStudentRoster,
    getStudentRosterSnapshot,
    getServerStudentRosterSnapshot
  );
  const studentRoster = getStudentRoster(rosterSnapshot);
  const attendanceSnapshot = useSyncExternalStore(
    subscribeToTeacherAttendance,
    getTeacherAttendanceSnapshot,
    getServerTeacherAttendanceSnapshot
  );
  const savedStatuses = getTodayTeacherStatuses(attendanceSnapshot);
  const getTeacherStatus = (teacher) =>
    savedStatuses[teacher.id] || teacher.status || "present";

  const attendanceCounts = studentRoster.reduce(
    (counts, teacher) => {
      counts[getTeacherStatus(teacher)] += 1;
      return counts;
    },
    { present: 0, late: 0, absent: 0 }
  );

  const totalStudents = studentRoster.reduce(
    (total, teacher) => total + teacher.assignedStudents.length,
    0
  );

  const handleAttendanceChange = (teacherId, status) => {
    const statuses = {
      ...savedStatuses,
      [teacherId]: status,
    };

    saveTodayTeacherStatuses(statuses);
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
          <Link
            href="/management/admin/dashboard"
            className="admin-nav-link active"
            aria-current="page"
          >
            <span className="admin-nav-icon" aria-hidden="true">⌂</span>
            Dashboard
          </Link>
          <Link
            href="/management/admin/students"
            className="admin-nav-link"
          >
            <span className="admin-nav-icon" aria-hidden="true">♙</span>
            Students
          </Link>
          <Link
            href="/management/admin/teachers"
            className="admin-nav-link"
          >
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
          <span className="admin-nav-link disabled" aria-disabled="true" title="Coming soon">
            <span className="admin-nav-icon" aria-hidden="true">▤</span>
            Reports
            <span className="nav-coming-soon">Soon</span>
          </span>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-branch-avatar" aria-hidden="true">MB</div>
          <div>
            <strong>Main Branch</strong>
            <span>Branch administrator</span>
          </div>
        </div>
        <Link
          className="admin-logout-link"
          href="/management/login"
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
            <div className="admin-user-avatar">BA</div>
            <div className="admin-user-details">
              <strong>Branch Admin</strong>
              <span>Main Branch</span>
            </div>
          </div>
        </header>

        <div className="admin-content">
          <section className="admin-welcome">
            <div>
              <p className="admin-eyebrow">BRANCH OVERVIEW</p>
              <h1>{getGreeting()}, Admin</h1>
              <p>Here&apos;s what&apos;s happening at your branch today.</p>
            </div>
            <div className="admin-branch-badge">
              <span aria-hidden="true">⌖</span>
              {branch}
            </div>
          </section>

          <div className="admin-demo-notice" role="note">
            <span className="notice-icon" aria-hidden="true">i</span>
            <p>
              Dashboard preview uses sample branch data. Teacher attendance
              changes are saved in this browser for today.
            </p>
          </div>

          <section className="admin-stats-grid" aria-label="Branch statistics">
            <article className="admin-stat-card">
              <div className="admin-stat-heading">
                <span>Students</span>
                <span className="admin-stat-icon students">♙</span>
              </div>
              <strong>{totalStudents}</strong>
              <p>Across {studentRoster.length} teacher groups</p>
            </article>
            <article className="admin-stat-card">
              <div className="admin-stat-heading">
                <span>Teachers</span>
                <span className="admin-stat-icon teachers">♧</span>
              </div>
              <strong>{studentRoster.length}</strong>
              <p>Assigned to this branch</p>
            </article>
            <article className="admin-stat-card">
              <div className="admin-stat-heading">
                <span>Present today</span>
                <span className="admin-stat-icon present">✓</span>
              </div>
              <strong>{attendanceCounts.present}</strong>
              <p>Teachers checked in</p>
            </article>
            <article className="admin-stat-card">
              <div className="admin-stat-heading">
                <span>Late / absent</span>
                <span className="admin-stat-icon attention">!</span>
              </div>
              <strong>{attendanceCounts.late + attendanceCounts.absent}</strong>
              <p>{attendanceCounts.late} late · {attendanceCounts.absent} absent</p>
            </article>
          </section>

          <div className="admin-dashboard-columns">
            <section className="admin-panel attendance-panel">
              <div className="admin-panel-heading">
                <div>
                  <h2>Teacher attendance</h2>
                  <p>Mark each teacher&apos;s attendance for today.</p>
                </div>
                <span className="admin-live-date">TODAY</span>
              </div>

              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">Teacher</th>
                      <th scope="col">Class</th>
                      <th scope="col">Status</th>
                      <th scope="col">Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentRoster.map((teacher) => {
                      const status = getTeacherStatus(teacher);
                      return (
                        <tr key={teacher.id}>
                          <td>
                            <div className="admin-teacher-cell">
                              <span className="teacher-initials" aria-hidden="true">
                                {teacher.name
                                  .split(" ")
                                  .map((part) => part[0])
                                  .join("")}
                              </span>
                              <span>
                                <strong>{teacher.name}</strong>
                                <small>{teacher.subject}</small>
                              </span>
                            </div>
                          </td>
                          <td>{teacher.assignedStudents.length} students</td>
                          <td>
                            <span className={`attendance-pill ${status}`}>
                              <span aria-hidden="true" />
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                          </td>
                          <td>
                            <label className="status-select-label">
                              <span className="visually-hidden">
                                Set attendance for {teacher.name}
                              </span>
                              <select
                                value={status}
                                onChange={(event) =>
                                  handleAttendanceChange(
                                    teacher.id,
                                    event.target.value
                                  )
                                }
                              >
                                <option value="present">Present</option>
                                <option value="late">Late</option>
                                <option value="absent">Absent</option>
                              </select>
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="panel-footnote">
                Attendance is a local demo and is not shared with other users.
              </p>
            </section>

            <section className="admin-panel reports-panel">
              <div className="admin-panel-heading">
                <div>
                  <h2>Recent teacher reports</h2>
                  <p>Latest updates from your teaching team.</p>
                </div>
                <span className="reports-count">{recentReports.length}</span>
              </div>
              <div className="report-list">
                {recentReports.map((report) => (
                  <article className="report-item" key={report.id}>
                    <div className={`report-type-icon type-${report.type.toLowerCase()}`}>
                      {report.type === "Attendance" ? "✓" : report.type === "Progress" ? "▤" : "!"}
                    </div>
                    <div className="report-copy">
                      <div className="report-title-row">
                        <h3>{report.title}</h3>
                        <span>{report.type}</span>
                      </div>
                      <p>{report.detail}</p>
                      <small>{report.teacher} · {report.time}</small>
                    </div>
                  </article>
                ))}
              </div>
              <p className="panel-footnote">
                Sample reports shown. Report submission will be connected later.
              </p>
            </section>
          </div>

          <section className="admin-panel teacher-groups-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>Teachers and assigned students</h2>
                <p>At-a-glance student distribution for this branch.</p>
              </div>
              <span className="admin-table-caption">{studentRoster.length} teachers</span>
            </div>
            <div className="teacher-groups-list">
              {studentRoster.map((teacher) => (
                <details className="teacher-group-row" key={teacher.id}>
                  <summary>
                    <span className="teacher-initials" aria-hidden="true">
                      {teacher.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")}
                    </span>
                    <span className="teacher-row-identity">
                      <strong>{teacher.name}</strong>
                      <small>{teacher.subject}</small>
                    </span>
                    <span className="teacher-row-count">
                      <strong>{teacher.assignedStudents.length}</strong>
                      <span>
                        {teacher.assignedStudents.length === 1
                          ? "student"
                          : "students"}
                      </span>
                    </span>
                    <span className="teacher-row-toggle">View students</span>
                  </summary>
                  <ul className="assigned-student-list">
                    {teacher.assignedStudents.map((student, index) => (
                      <li key={`${teacher.id}-${student}`}>
                        <span className="student-list-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span>{student}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>

          <footer className="admin-footer">
            <span>Jafar Madrasa Management</span>
            <span>{branch}</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
