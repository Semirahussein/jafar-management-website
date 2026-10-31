"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiRequest } from "@/app/lib/api";
import { useAuth } from "../../../auth-provider";
import "../../dashboard/dashboard.css";
import "../students.css";
import "./register.css";

function getToday() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export default function RegisterStudentPage() {
  const router = useRouter();
  const { credentials, signOut, user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [name, setName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [branchId, setBranchId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [enrollmentDate, setEnrollmentDate] = useState(getToday);
  const [currentLevel, setCurrentLevel] = useState("");

  useEffect(() => {
    if (!credentials || !user) {
      router.replace("/management/login");
      return;
    }

    if (user.role !== "ADMINISTRATOR") return;

    let active = true;
    Promise.all([
      apiRequest("/api/branches", { auth: credentials }),
      apiRequest("/api/users", { auth: credentials }),
    ])
      .then(([branchList, userList]) => {
        if (!Array.isArray(branchList) || !Array.isArray(userList)) {
          throw new Error("The backend returned an unexpected branches or users response.");
        }
        if (!active) return;

        setBranches(branchList.filter((branch) => branch.active));
        setTeachers(
          userList.filter(
            (candidate) =>
              candidate.active &&
              candidate.role === "QURAN_TEACHER" &&
              candidate.branchId !== null
          )
        );
      })
      .catch((error) => {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load branches and teachers."
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [credentials, router, user]);

  const selectedBranchId = branchId ? Number(branchId) : null;
  const branchTeachers = useMemo(
    () => teachers.filter((teacher) => teacher.branchId === selectedBranchId),
    [selectedBranchId, teachers]
  );
  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId);
  const accessError =
    user && user.role !== "ADMINISTRATOR"
      ? "Only administrators can register students from this page."
      : "";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!credentials || user?.role !== "ADMINISTRATOR") {
      setFormError("Sign in as an administrator before registering a student.");
      return;
    }
    if (!selectedBranchId) {
      setFormError("Choose a branch.");
      return;
    }
    if (teacherId && !branchTeachers.some((teacher) => teacher.id === Number(teacherId))) {
      setFormError("Choose a teacher assigned to the selected branch.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("/api/students", {
        method: "POST",
        auth: credentials,
        body: {
          fullName: name.trim(),
          studentNumber: studentNumber.trim(),
          gender: gender || null,
          dateOfBirth: dateOfBirth || null,
          guardianName: guardianName.trim() || null,
          guardianPhone: guardianPhone.trim() || null,
          branchId: selectedBranchId,
          teacherId: teacherId ? Number(teacherId) : null,
          enrollmentDate,
          currentLevel: currentLevel.trim() || null,
        },
      });
      router.push("/management/admin/students");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setFormError("Your sign-in is no longer valid. Sign in again and retry.");
      } else {
        setFormError(
          error instanceof Error ? error.message : "Unable to register this student."
        );
      }
    } finally {
      setIsSubmitting(false);
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
          <Link href="/management/admin/students" className="admin-nav-link active">
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
          <Link className="register-back-link" href="/management/admin/students">
            Back to students
          </Link>
          <div className="admin-user">
            <div className="admin-user-avatar">AD</div>
            <div className="admin-user-details">
              <strong>{user?.username || "Administrator"}</strong>
              <span>Administrator</span>
            </div>
          </div>
        </header>

        <div className="admin-content register-student-content">
          <section className="admin-welcome">
            <div>
              <p className="admin-eyebrow">STUDENT REGISTRATION</p>
              <h1>Register a student</h1>
              <p>Enter the student’s details and assign them to a branch and teacher.</p>
            </div>
            {selectedBranch && (
              <div className="admin-branch-badge">
                <span aria-hidden="true">⌖</span>
                {selectedBranch.name}
              </div>
            )}
          </section>

          <section className="register-student-panel">
            {accessError ? (
              <p className="register-student-error" role="alert">{accessError}</p>
            ) : isLoading ? (
              <p role="status">Loading branches and teachers from the backend…</p>
            ) : loadError ? (
              <p className="register-student-error" role="alert">{loadError}</p>
            ) : branches.length === 0 ? (
              <p role="status">
                No active branches were found. Create a branch before registering students.
              </p>
            ) : (
              <form className="register-student-form" onSubmit={handleSubmit}>
                <label>
                  Student full name
                  <input
                    type="text"
                    autoComplete="name"
                    maxLength={150}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </label>

                <label>
                  Student number
                  <input
                    type="text"
                    maxLength={50}
                    value={studentNumber}
                    onChange={(event) => setStudentNumber(event.target.value)}
                    placeholder="For example, STU-001"
                    required
                  />
                </label>

                <label>
                  Branch
                  <select
                    value={branchId}
                    onChange={(event) => {
                      setBranchId(event.target.value);
                      setTeacherId("");
                    }}
                    required
                  >
                    <option value="" disabled>Select a branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Quran teacher (optional)
                  <select
                    value={teacherId}
                    onChange={(event) => setTeacherId(event.target.value)}
                    disabled={!selectedBranchId || branchTeachers.length === 0}
                  >
                    <option value="">
                      {selectedBranchId
                        ? "No teacher assigned"
                        : "Choose a branch first"}
                    </option>
                    {branchTeachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.username}
                      </option>
                    ))}
                  </select>
                  {selectedBranchId && branchTeachers.length === 0 && (
                    <small>No active Quran teachers are registered for this branch.</small>
                  )}
                </label>

                <label>
                  Enrollment date
                  <input
                    type="date"
                    value={enrollmentDate}
                    max={getToday()}
                    onChange={(event) => setEnrollmentDate(event.target.value)}
                    required
                  />
                </label>

                <label>
                  Date of birth (optional)
                  <input
                    type="date"
                    value={dateOfBirth}
                    max={getToday()}
                    onChange={(event) => setDateOfBirth(event.target.value)}
                  />
                </label>

                <label>
                  Gender (optional)
                  <select value={gender} onChange={(event) => setGender(event.target.value)}>
                    <option value="">Not specified</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </label>

                <label>
                  Quran learning level (optional)
                  <input
                    type="text"
                    maxLength={80}
                    value={currentLevel}
                    onChange={(event) => setCurrentLevel(event.target.value)}
                    placeholder="For example, Hifz"
                  />
                </label>

                <label>
                  Guardian name (optional)
                  <input
                    type="text"
                    maxLength={150}
                    value={guardianName}
                    onChange={(event) => setGuardianName(event.target.value)}
                  />
                </label>

                <label>
                  Guardian phone (optional)
                  <input
                    type="tel"
                    maxLength={30}
                    value={guardianPhone}
                    onChange={(event) => setGuardianPhone(event.target.value)}
                  />
                </label>

                {formError && (
                  <p className="register-student-error" role="alert">
                    {formError}
                  </p>
                )}

                <div className="register-student-actions">
                  <Link href="/management/admin/students">Cancel</Link>
                  <button
                    type="submit"
                    disabled={isSubmitting || branches.length === 0}
                  >
                    {isSubmitting ? "Registering…" : "Register student"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
