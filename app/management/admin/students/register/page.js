"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "../../dashboard/dashboard.css";
import "../students.css";
import "./register.css";
import {
  getServerStudentRosterSnapshot,
  getStudentProfiles,
  getStudentRoster,
  getStudentRosterSnapshot,
  saveStudentRoster,
  subscribeToStudentRoster,
} from "../studentRoster";

const branch = "Jafar Madrasa - Main Branch";
const levels = ["Hifz", "Al Qaeda", "Tilawa"];

export default function RegisterStudentPage() {
  const router = useRouter();
  const rosterSnapshot = useSyncExternalStore(
    subscribeToStudentRoster,
    getStudentRosterSnapshot,
    getServerStudentRosterSnapshot
  );
  const teachers = getStudentRoster(rosterSnapshot);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [level, setLevel] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [formError, setFormError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const parsedAge = Number(age);
    const selectedTeacher = teachers.find(
      (teacher) => teacher.id === Number(teacherId)
    );

    if (!trimmedName || !Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 100) {
      setFormError("Enter the student’s name and a valid age from 1 to 100.");
      return;
    }

    if (!levels.includes(level)) {
      setFormError("Choose a student level.");
      return;
    }

    if (!selectedTeacher) {
      setFormError("Choose a teacher for this student.");
      return;
    }

    const highestStudentNumber = teachers
      .flatMap(getStudentProfiles)
      .reduce((highest, profile) => {
        const match = profile?.id.match(/^registered-student-(\d+)$/);
        return match ? Math.max(highest, Number(match[1])) : highest;
      }, 0);
    const profile = {
      id: `registered-student-${highestStudentNumber + 1}`,
      age: parsedAge,
      level,
    };
    const updatedRoster = teachers.map((teacher) => {
      if (teacher.id !== selectedTeacher.id) {
        return teacher;
      }

      return {
        ...teacher,
        assignedStudents: [...teacher.assignedStudents, trimmedName],
        studentProfiles: [...getStudentProfiles(teacher), profile],
      };
    });

    saveStudentRoster(updatedRoster);
    router.push("/management/admin/students");
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
          <div className="admin-branch-avatar" aria-hidden="true">MB</div>
          <div>
            <strong>Main Branch</strong>
            <span>Branch administrator</span>
          </div>
        </div>
        <Link className="admin-logout-link" href="/management/login">
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
          <Link className="register-back-link" href="/management/admin/students">
            Back to students
          </Link>
          <div className="admin-user">
            <div className="admin-user-avatar">BA</div>
            <div className="admin-user-details">
              <strong>Branch Admin</strong>
              <span>Main Branch</span>
            </div>
          </div>
        </header>

        <div className="admin-content register-student-content">
          <section className="admin-welcome">
            <div>
              <p className="admin-eyebrow">STUDENT REGISTRATION</p>
              <h1>Register a student</h1>
              <p>Enter the student’s details and assign them to a teacher.</p>
            </div>
            <div className="admin-branch-badge">
              <span aria-hidden="true">⌖</span>
              {branch}
            </div>
          </section>

          <section className="register-student-panel">
            <form className="register-student-form" onSubmit={handleSubmit}>
              <label>
                Student name
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter the student’s full name"
                  required
                />
              </label>

              <label>
                Age
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                  placeholder="Enter age"
                  required
                />
              </label>

              <label>
                Level
                <select
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                  required
                >
                  <option value="" disabled>Select a level</option>
                  {levels.map((studentLevel) => (
                    <option key={studentLevel} value={studentLevel}>
                      {studentLevel}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Assign to teacher
                <select
                  value={teacherId}
                  onChange={(event) => setTeacherId(event.target.value)}
                  required
                  disabled={teachers.length === 0}
                >
                  <option value="" disabled>Select a teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </label>

              {formError && (
                <p className="register-student-error" role="alert">
                  {formError}
                </p>
              )}

              <div className="register-student-actions">
                <Link href="/management/admin/students">Cancel</Link>
                <button type="submit" disabled={teachers.length === 0}>
                  Register student
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
