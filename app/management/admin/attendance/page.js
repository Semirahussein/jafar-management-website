"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import "../dashboard/dashboard.css";
import "./attendance.css";
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
} from "./teacherAttendance";

const branch = "Jafar Madrasa - Main Branch";

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

export default function AdminTeacherAttendancePage() {
  const rosterSnapshot = useSyncExternalStore(
    subscribeToStudentRoster,
    getStudentRosterSnapshot,
    getServerStudentRosterSnapshot
  );
  const attendanceSnapshot = useSyncExternalStore(
    subscribeToTeacherAttendance,
    getTeacherAttendanceSnapshot,
    getServerTeacherAttendanceSnapshot
  );
  const teachers = getStudentRoster(rosterSnapshot);
  const savedStatuses = getTodayTeacherStatuses(attendanceSnapshot);
  const [statusChanges, setStatusChanges] = useState({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const statuses = { ...savedStatuses, ...statusChanges };

  const presentCount = teachers.filter(
    (teacher) => statuses[teacher.id] === "present"
  ).length;
  const lateCount = teachers.filter(
    (teacher) => statuses[teacher.id] === "late"
  ).length;
  const absentCount = teachers.filter(
    (teacher) => statuses[teacher.id] === "absent"
  ).length;
  const allTeachersMarked =
    teachers.length > 0 &&
    teachers.every((teacher) =>
      ["present", "late", "absent"].includes(statuses[teacher.id])
    );

  const updateStatus = (teacherId, status) => {
    setStatusChanges((current) => ({
      ...current,
      [teacherId]: status,
    }));
    setSubmitted(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!allTeachersMarked) {
      return;
    }

    setShowConfirmation(true);
  };

  const confirmAttendance = () => {
    const completeStatuses = Object.fromEntries(
      teachers.map((teacher) => [teacher.id, statuses[teacher.id]])
    );
    saveTodayTeacherStatuses(completeStatuses);
    setStatusChanges({});
    setShowConfirmation(false);
    setSubmitted(true);
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
          <Link href="/management/admin/students" className="admin-nav-link">
            <span className="admin-nav-icon" aria-hidden="true">♙</span>
            Students
          </Link>
          <Link href="/management/admin/teachers" className="admin-nav-link">
            <span className="admin-nav-icon" aria-hidden="true">♧</span>
            Teachers
          </Link>
          <Link href="/management/admin/assignments" className="admin-nav-link">
            <span className="admin-nav-icon" aria-hidden="true">⇄</span>
            Assignments
          </Link>
          <Link
            href="/management/admin/attendance"
            className="admin-nav-link active"
            aria-current="page"
          >
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
              <p className="admin-eyebrow">BRANCH TEAM</p>
              <h1>{getGreeting()}, Admin</h1>
              <p>Record today&apos;s attendance for teachers at this branch.</p>
            </div>
            <div className="admin-branch-badge">
              <span aria-hidden="true">⌖</span>
              {branch}
            </div>
          </section>

          {submitted && (
            <p className="teacher-attendance-notice" role="status">
              Today&apos;s teacher attendance has been recorded successfully.
            </p>
          )}

          {teachers.length === 0 ? (
            <section className="admin-panel teacher-attendance-empty">
              <h2>No teachers to mark</h2>
              <p>Add teachers to the branch before taking attendance.</p>
              <Link href="/management/admin/teachers">Manage teachers</Link>
            </section>
          ) : (
            <form
              className="teacher-attendance-content"
              onSubmit={handleSubmit}
            >
              <section className="teacher-attendance-card">
                <div className="teacher-attendance-card-header">
                  <div>
                    <h2>Teacher Attendance</h2>
                    <p>
                      Select one attendance status for each teacher.
                    </p>
                  </div>
                  <span className="teacher-attendance-count">
                    {teachers.length}{" "}
                    {teachers.length === 1 ? "Teacher" : "Teachers"}
                  </span>
                </div>

                <div className="teacher-attendance-table">
                  <div className="teacher-attendance-table-header">
                    <span>Teacher</span>
                    <span>Attendance</span>
                  </div>
                  {teachers.map((teacher) => (
                    <div className="teacher-attendance-row" key={teacher.id}>
                      <div className="teacher-attendance-identity">
                        <div className="teacher-attendance-avatar">
                          {teacher.name.charAt(0)}
                        </div>
                        <div>
                          <strong>{teacher.name}</strong>
                          <span>{teacher.subject}</span>
                        </div>
                      </div>
                      <div
                        className="teacher-attendance-options"
                        role="group"
                        aria-label={`Attendance for ${teacher.name}`}
                      >
                        {["present", "late", "absent"].map((status) => (
                          <button
                            type="button"
                            key={status}
                            className={`teacher-attendance-option ${status}${
                              statuses[teacher.id] === status ? " selected" : ""
                            }`}
                            aria-pressed={statuses[teacher.id] === status}
                            onClick={() => updateStatus(teacher.id, status)}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section
                className="teacher-attendance-summary"
                aria-label="Attendance summary"
              >
                <div className="teacher-attendance-summary-item present">
                  <span className="teacher-attendance-summary-number">
                    {presentCount}
                  </span>
                  <span className="teacher-attendance-summary-label">Present</span>
                </div>
                <div className="teacher-attendance-summary-item late">
                  <span className="teacher-attendance-summary-number">
                    {lateCount}
                  </span>
                  <span className="teacher-attendance-summary-label">Late</span>
                </div>
                <div className="teacher-attendance-summary-item absent">
                  <span className="teacher-attendance-summary-number">
                    {absentCount}
                  </span>
                  <span className="teacher-attendance-summary-label">Absent</span>
                </div>
              </section>

              <div className="teacher-attendance-actions">
                {!allTeachersMarked && (
                  <span className="teacher-attendance-hint">
                    Mark every teacher to submit attendance.
                  </span>
                )}
                <button
                  type="submit"
                  className="teacher-attendance-submit"
                  disabled={!allTeachersMarked}
                >
                  Submit Attendance
                </button>
              </div>
            </form>
          )}

          <footer className="admin-footer">
            <span>Jafar Madrasa Management</span>
            <span>{branch}</span>
          </footer>
        </div>
      </main>

      {showConfirmation && (
        <div className="teacher-attendance-overlay">
          <section
            className="teacher-attendance-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-attendance-confirm-title"
          >
            <button
              type="button"
              className="teacher-attendance-close"
              aria-label="Close confirmation"
              onClick={() => setShowConfirmation(false)}
            >
              ×
            </button>
            <div className="teacher-attendance-confirm-icon" aria-hidden="true">
              ?
            </div>
            <h2 id="teacher-attendance-confirm-title">
              Submit Attendance?
            </h2>
            <p>
              You are about to submit today&apos;s attendance for all teachers.
            </p>
            <div className="teacher-attendance-confirm-summary">
              <div><strong>{presentCount}</strong><span>Present</span></div>
              <div><strong>{lateCount}</strong><span>Late</span></div>
              <div><strong>{absentCount}</strong><span>Absent</span></div>
            </div>
            <div className="teacher-attendance-confirm-actions">
              <button
                type="button"
                className="teacher-attendance-cancel"
                onClick={() => setShowConfirmation(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="teacher-attendance-confirm"
                onClick={confirmAttendance}
              >
                Confirm Submission
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
