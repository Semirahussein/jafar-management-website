"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import "../dashboard/dashboard.css";
import "./students.css";
import {
  getServerStudentRosterSnapshot,
  getStudentRoster,
  getStudentRosterSnapshot,
  saveStudentRoster,
  subscribeToStudentRoster,
} from "./studentRoster";

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

export default function AdminStudentsPage() {
  const rosterSnapshot = useSyncExternalStore(
    subscribeToStudentRoster,
    getStudentRosterSnapshot,
    getServerStudentRosterSnapshot
  );
  const teachers = getStudentRoster(rosterSnapshot);
  const [editingStudent, setEditingStudent] = useState(null);
  const [targetTeacherId, setTargetTeacherId] = useState("");
  const totalStudents = teachers.reduce(
    (count, teacher) => count + teacher.assignedStudents.length,
    0
  );

  const saveStudentMove = (event) => {
    event.preventDefault();
    if (!editingStudent || !targetTeacherId) {
      return;
    }

    const destinationId = Number(targetTeacherId);
    if (destinationId === editingStudent.teacherId) {
      setEditingStudent(null);
      return;
    }

    const updatedTeachers = teachers.map((teacher) => {
      if (teacher.id === editingStudent.teacherId) {
        return {
          ...teacher,
          assignedStudents: teacher.assignedStudents.filter(
            (_, index) => index !== editingStudent.studentIndex
          ),
        };
      }

      if (teacher.id === destinationId) {
        return {
          ...teacher,
          assignedStudents: [...teacher.assignedStudents, editingStudent.name],
        };
      }

      return teacher;
    });

    saveStudentRoster(updatedTeachers);
    setEditingStudent(null);
  };

  const openStudentEditor = (teacherId, studentIndex, name) => {
    setEditingStudent({ teacherId, studentIndex, name });
    setTargetTeacherId("");
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
            className="admin-nav-link"
          >
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
              <p className="admin-eyebrow">STUDENT OVERVIEW</p>
              <h1>{getGreeting()}, Admin</h1>
              <p>Review all students grouped by their assigned teacher.</p>
            </div>
            <div className="admin-branch-badge">
              <span aria-hidden="true">⌖</span>
              {branch}
            </div>
          </section>

          <section className="admin-student-summary" aria-label="Student totals">
            <article className="admin-stat-card">
              <div className="admin-stat-heading">
                <span>Total students</span>
                <span className="admin-stat-icon students">♙</span>
              </div>
              <strong>{totalStudents}</strong>
              <p>Across {teachers.length} teacher groups</p>
            </article>

            <article className="admin-stat-card">
              <div className="admin-stat-heading">
                <span>Teacher groups</span>
                <span className="admin-stat-icon teachers">♧</span>
              </div>
              <strong>{teachers.length}</strong>
              <p>Active class groups</p>
            </article>
          </section>

          <section className="admin-panel teacher-students-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>Students by teacher</h2>
                <p>All assigned learners under each class group.</p>
              </div>
              <span className="admin-table-caption">{totalStudents} students</span>
            </div>

            <div className="teacher-student-groups">
              {teachers.map((teacher) => (
                <article className="teacher-student-card" key={teacher.id}>
                  <div className="teacher-student-header">
                    <div className="teacher-initials" aria-hidden="true">
                      {teacher.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")}
                    </div>

                    <div className="teacher-student-meta">
                      <strong>{teacher.name}</strong>
                      <small>{teacher.subject}</small>
                    </div>

                    <span className="student-count-badge">
                      {teacher.assignedStudents.length}
                      {teacher.assignedStudents.length === 1 ? " student" : " students"}
                    </span>
                  </div>

                  <ul className="student-chip-list">
                    {teacher.assignedStudents.map((student, index) => {
                      const isEditing =
                        editingStudent?.teacherId === teacher.id &&
                        editingStudent.studentIndex === index;

                      return (
                        <li
                          key={`${teacher.id}-${student}`}
                          className={`student-chip-item${isEditing ? " editing" : ""}`}
                        >
                          {isEditing ? (
                            <form
                              className="student-edit-form"
                              onSubmit={saveStudentMove}
                            >
                              <span className="student-edit-name">{student}</span>
                              <label>
                                <span className="visually-hidden">
                                  Move {student} to teacher
                                </span>
                                <select
                                  required
                                  value={targetTeacherId}
                                  onChange={(event) =>
                                    setTargetTeacherId(event.target.value)
                                  }
                                >
                                  <option value="" disabled>
                                    Select teacher
                                  </option>
                                  {teachers
                                    .filter((candidate) => candidate.id !== teacher.id)
                                    .map((candidate) => (
                                      <option
                                        key={candidate.id}
                                        value={candidate.id}
                                      >
                                        {candidate.name}
                                      </option>
                                    ))}
                                </select>
                              </label>
                              <div className="student-edit-actions">
                                <button type="submit" disabled={!targetTeacherId}>
                                  Save
                                </button>
                                <button
                                  type="button"
                                  className="student-edit-cancel"
                                  onClick={() => setEditingStudent(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <span className="student-list-number">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <span className="student-chip-name">{student}</span>
                              <button
                                type="button"
                                className="student-edit-button"
                                onClick={() =>
                                  openStudentEditor(teacher.id, index, student)
                                }
                                aria-label={`Edit ${student}`}
                              >
                                Edit student
                              </button>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </article>
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
