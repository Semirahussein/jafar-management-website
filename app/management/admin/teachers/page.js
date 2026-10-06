"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import "../dashboard/dashboard.css";
import "./teachers.css";
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

export default function AdminTeachersPage() {
  const rosterSnapshot = useSyncExternalStore(
    subscribeToStudentRoster,
    getStudentRosterSnapshot,
    getServerStudentRosterSnapshot
  );
  const teachers = getStudentRoster(rosterSnapshot);
  const [teacherName, setTeacherName] = useState("");
  const [teacherSubject, setTeacherSubject] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [removingTeacherId, setRemovingTeacherId] = useState(null);
  const [destinationTeacherId, setDestinationTeacherId] = useState("");

  const addTeacher = (event) => {
    event.preventDefault();
    const name = teacherName.trim();
    const subject = teacherSubject.trim();

    if (!name || !subject) {
      setFormError("Enter both the teacher's name and subject.");
      return;
    }

    if (teachers.some((teacher) => teacher.name.toLowerCase() === name.toLowerCase())) {
      setFormError("A teacher with this name is already listed.");
      return;
    }

    const nextId = teachers.reduce(
      (largestId, teacher) => Math.max(largestId, teacher.id),
      0
    ) + 1;

    saveStudentRoster([
      ...teachers,
      {
        id: nextId,
        name,
        subject,
        assignedStudents: [],
        status: "present",
      },
    ]);
    setTeacherName("");
    setTeacherSubject("");
    setFormError("");
    setNotice(`${name} was added to the branch.`);
  };

  const confirmTeacherRemoval = (teacherToRemove) => {
    const destinationId = Number(destinationTeacherId);
    if (
      teacherToRemove.assignedStudents.length > 0 &&
      (!destinationTeacherId || destinationId === teacherToRemove.id)
    ) {
      setNotice("Choose another teacher to receive this teacher's students.");
      return;
    }

    const updatedTeachers = teachers
      .filter((teacher) => teacher.id !== teacherToRemove.id)
      .map((teacher) =>
        teacher.id === destinationId
          ? {
              ...teacher,
              assignedStudents: [
                ...teacher.assignedStudents,
                ...teacherToRemove.assignedStudents,
              ],
            }
          : teacher
      );

    saveStudentRoster(updatedTeachers);
    setRemovingTeacherId(null);
    setDestinationTeacherId("");
    setNotice(
      teacherToRemove.assignedStudents.length > 0
        ? `${teacherToRemove.name} was removed and their students were moved.`
        : `${teacherToRemove.name} was removed from the branch.`
    );
  };

  const beginTeacherRemoval = (teacher) => {
    setNotice("");
    setRemovingTeacherId(teacher.id);
    setDestinationTeacherId("");
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
          <Link
            href="/management/admin/teachers"
            className="admin-nav-link active"
            aria-current="page"
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
              <p className="admin-eyebrow">BRANCH TEAM</p>
              <h1>{getGreeting()}, Admin</h1>
              <p>Manage the teachers and subjects at your branch.</p>
            </div>
            <div className="admin-branch-badge">
              <span aria-hidden="true">⌖</span>
              {branch}
            </div>
          </section>

          {notice && (
            <p className="teacher-page-notice" role="status">
              {notice}
            </p>
          )}

          <section className="admin-panel teacher-form-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>Add a teacher</h2>
                <p>Add a teacher to this branch roster.</p>
              </div>
            </div>

            <form className="teacher-add-form" onSubmit={addTeacher}>
              <label>
                <span>Teacher name</span>
                <input
                  required
                  value={teacherName}
                  onChange={(event) => setTeacherName(event.target.value)}
                  placeholder="e.g. Fatima Ahmed"
                />
              </label>
              <label>
                <span>Subject</span>
                <input
                  required
                  value={teacherSubject}
                  onChange={(event) => setTeacherSubject(event.target.value)}
                  placeholder="e.g. Quran & Tajweed"
                />
              </label>
              <button className="teacher-primary-button" type="submit">
                Add teacher
              </button>
            </form>
            {formError && (
              <p className="teacher-form-error" role="alert">
                {formError}
              </p>
            )}
          </section>

          <section className="admin-panel teacher-directory-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>Teachers in this branch</h2>
                <p>View each teacher, their subject, and assigned students.</p>
              </div>
              <span className="admin-table-caption">
                {teachers.length} {teachers.length === 1 ? "teacher" : "teachers"}
              </span>
            </div>

            {teachers.length === 0 ? (
              <p className="teacher-empty-state">
                No teachers have been added to this branch yet.
              </p>
            ) : (
              <div className="teacher-directory-list">
                {teachers.map((teacher) => (
                  <article className="teacher-directory-card" key={teacher.id}>
                    <div className="teacher-directory-identity">
                      <span className="teacher-initials" aria-hidden="true">
                        {teacher.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")}
                      </span>
                      <span className="teacher-directory-copy">
                        <strong>{teacher.name}</strong>
                        <small>{teacher.subject}</small>
                      </span>
                    </div>
                    <div className="teacher-directory-students">
                      <strong>{teacher.assignedStudents.length}</strong>
                      <span>
                        {teacher.assignedStudents.length === 1
                          ? "student"
                          : "students"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="teacher-remove-button"
                      onClick={() => beginTeacherRemoval(teacher)}
                    >
                      Remove
                    </button>

                    {removingTeacherId === teacher.id && (
                      <div className="teacher-remove-confirm">
                        <p>
                          Remove <strong>{teacher.name}</strong> from this branch?
                          {teacher.assignedStudents.length > 0 &&
                            ` This will move ${teacher.assignedStudents.length} assigned ${
                              teacher.assignedStudents.length === 1
                                ? "student"
                                : "students"
                            }.`}
                        </p>
                        {teacher.assignedStudents.length > 0 && (
                          <label>
                            <span>Move students to</span>
                            <select
                              required
                              value={destinationTeacherId}
                              onChange={(event) =>
                                setDestinationTeacherId(event.target.value)
                              }
                            >
                              <option value="" disabled>
                                Select a teacher
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
                        )}
                        <div className="teacher-remove-actions">
                          <button
                            type="button"
                            className="teacher-confirm-remove"
                            disabled={
                              teacher.assignedStudents.length > 0 &&
                              (!destinationTeacherId ||
                                Number(destinationTeacherId) === teacher.id)
                            }
                            onClick={() => confirmTeacherRemoval(teacher)}
                          >
                            Confirm removal
                          </button>
                          <button
                            type="button"
                            className="teacher-cancel-remove"
                            onClick={() => {
                              setRemovingTeacherId(null);
                              setDestinationTeacherId("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
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
