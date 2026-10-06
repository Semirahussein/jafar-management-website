"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import "../dashboard/dashboard.css";
import "./assignments.css";
import {
  getServerStudentRosterSnapshot,
  getStudentRoster,
  getStudentRosterSnapshot,
  saveStudentRoster,
  subscribeToStudentRoster,
} from "../students/studentRoster";

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

export default function AdminAssignmentsPage() {
  const rosterSnapshot = useSyncExternalStore(
    subscribeToStudentRoster,
    getStudentRosterSnapshot,
    getServerStudentRosterSnapshot
  );
  const teachers = getStudentRoster(rosterSnapshot);
  const [selectedTeacher, setSelectedTeacher] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [notice, setNotice] = useState("");

  const subjects = useMemo(
    () => [...new Set(teachers.map((teacher) => teacher.subject).filter(Boolean))].sort(),
    [teachers]
  );
  const assignments = useMemo(
    () =>
      teachers.flatMap((teacher) =>
        teacher.assignedStudents.map((student, index) => ({
          teacherId: teacher.id,
          teacherName: teacher.name,
          subject: teacher.subject,
          student,
          studentIndex: index,
        }))
      ),
    [teachers]
  );
  const query = searchQuery.trim().toLowerCase();
  const visibleAssignments = assignments.filter((assignment) => {
    const matchesTeacher =
      selectedTeacher === "all" ||
      assignment.teacherId === Number(selectedTeacher);
    const matchesSubject =
      selectedSubject === "all" || assignment.subject === selectedSubject;
    const matchesQuery =
      !query ||
      assignment.student.toLowerCase().includes(query) ||
      assignment.teacherName.toLowerCase().includes(query);

    return matchesTeacher && matchesSubject && matchesQuery;
  });

  const moveStudent = (assignment, destinationId) => {
    const destinationTeacherId = Number(destinationId);
    if (!destinationId || destinationTeacherId === assignment.teacherId) {
      return;
    }

    const updatedTeachers = teachers.map((teacher) => {
      if (teacher.id === assignment.teacherId) {
        return {
          ...teacher,
          assignedStudents: teacher.assignedStudents.filter(
            (_, index) => index !== assignment.studentIndex
          ),
        };
      }

      if (teacher.id === destinationTeacherId) {
        return {
          ...teacher,
          assignedStudents: [...teacher.assignedStudents, assignment.student],
        };
      }

      return teacher;
    });

    saveStudentRoster(updatedTeachers);
    setNotice(
      `${assignment.student} was moved from ${assignment.teacherName} to ${
        teachers.find((teacher) => teacher.id === destinationTeacherId)?.name
      }.`
    );
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
          <Link
            href="/management/admin/assignments"
            className="admin-nav-link active"
            aria-current="page"
          >
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
              <p className="admin-eyebrow">CLASS MANAGEMENT</p>
              <h1>{getGreeting()}, Admin</h1>
              <p>Review class groups and manage student-to-teacher assignments.</p>
            </div>
            <div className="admin-branch-badge">
              <span aria-hidden="true">⌖</span>
              {branch}
            </div>
          </section>

          <section className="admin-assignment-summary" aria-label="Assignment totals">
            <article className="admin-stat-card">
              <div className="admin-stat-heading">
                <span>Assigned students</span>
                <span className="admin-stat-icon students">♙</span>
              </div>
              <strong>{assignments.length}</strong>
              <p>Currently assigned to a teacher</p>
            </article>
            <article className="admin-stat-card">
              <div className="admin-stat-heading">
                <span>Teacher groups</span>
                <span className="admin-stat-icon teachers">♧</span>
              </div>
              <strong>{teachers.length}</strong>
              <p>Available for student assignment</p>
            </article>
            <article className="admin-stat-card">
              <div className="admin-stat-heading">
                <span>Subjects</span>
                <span className="admin-stat-icon present">▤</span>
              </div>
              <strong>{subjects.length}</strong>
              <p>Represented in this branch</p>
            </article>
          </section>

          {notice && (
            <p className="assignment-notice" role="status">
              {notice}
            </p>
          )}

          <section className="admin-panel assignments-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>Teacher and student assignments</h2>
                <p>Filter the roster or reassign a student to another teacher.</p>
              </div>
              <span className="admin-table-caption">
                {visibleAssignments.length} of {assignments.length} assignments
              </span>
            </div>

            <div className="assignment-filters">
              <label>
                <span>Search students or teachers</span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by name"
                />
              </label>
              <label>
                <span>Teacher</span>
                <select
                  value={selectedTeacher}
                  onChange={(event) => setSelectedTeacher(event.target.value)}
                >
                  <option value="all">All teachers</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Subject</span>
                <select
                  value={selectedSubject}
                  onChange={(event) => setSelectedSubject(event.target.value)}
                >
                  <option value="all">All subjects</option>
                  {subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {visibleAssignments.length === 0 ? (
              <p className="assignment-empty-state">
                {assignments.length === 0
                  ? "There are no student assignments in this branch yet."
                  : "No assignments match the selected filters."}
              </p>
            ) : (
              <div className="assignment-table-scroll">
                <table className="assignment-table">
                  <thead>
                    <tr>
                      <th scope="col">Student</th>
                      <th scope="col">Teacher</th>
                      <th scope="col">Subject</th>
                      <th scope="col">Reassign to</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleAssignments.map((assignment) => (
                      <tr
                        key={`${assignment.teacherId}-${assignment.studentIndex}-${assignment.student}`}
                      >
                        <td>
                          <div className="assignment-student-name">
                            <span className="student-list-number">
                              {String(assignment.studentIndex + 1).padStart(2, "0")}
                            </span>
                            <strong>{assignment.student}</strong>
                          </div>
                        </td>
                        <td>{assignment.teacherName}</td>
                        <td>
                          <span className="assignment-subject">
                            {assignment.subject}
                          </span>
                        </td>
                        <td>
                          {teachers.length > 1 ? (
                            <label className="assignment-move-label">
                              <span className="visually-hidden">
                                Reassign {assignment.student} to another teacher
                              </span>
                              <select
                                value=""
                                onChange={(event) =>
                                  moveStudent(assignment, event.target.value)
                                }
                              >
                                <option value="">Move student...</option>
                                {teachers
                                  .filter(
                                    (teacher) =>
                                      teacher.id !== assignment.teacherId
                                  )
                                  .map((teacher) => (
                                    <option
                                      key={teacher.id}
                                      value={teacher.id}
                                    >
                                      {teacher.name}
                                    </option>
                                  ))}
                              </select>
                            </label>
                          ) : (
                            <span className="assignment-no-teacher">
                              Add another teacher to move
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
