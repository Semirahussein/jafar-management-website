"use client";
import { useState, useEffect} from "react";
import Link from "next/link";
import "./dashboard.css";


function getTodayAttendance() {
  if (typeof window === "undefined") {
    return null;
  }

  const savedAttendance =
    localStorage.getItem("todayAttendance");

  if (!savedAttendance) {
    return null;
  }

  try {
    const data = JSON.parse(savedAttendance);

    const today = new Date()
      .toISOString()
      .split("T")[0];

    if (data.date === today) {
      return data;
    }

    return null;
  } catch {
    return null;
  }
}

export default function TeacherDashboard() {

  // =====================================================
  // DEMO TEACHER DATA
  // Later this will come from the backend.
  // =====================================================

  const teacher = {
    name: "Aisha Mohammed",
    branch: "Jafar Madrasa - Main Branch",
  };


  // =====================================================
  // DEMO STUDENT DATA
  // Later this will come from the backend.
  // =====================================================

  const students = [
    {
      id: 1,
      name: "Ahmed Abdullah",
      attendance: "Present",
      progress: "Al-Baqarah",
    },
    {
      id: 2,
      name: "Fatima Ali",
      attendance: "Present",
      progress: "An-Nas",
    },
    {
      id: 3,
      name: "Yusuf Ibrahim",
      attendance: "Absent",
      progress: "Al-Falaq",
    },
    {
      id: 4,
      name: "Maryam Hassan",
      attendance: "Present",
      progress: "Al-Ikhlas",
    },
  ];

  const dashboardStudents = attendance
  ? attendance.students
  : students;

  const [attendance, setAttendance] = useState(() => {
    if (typeof window === "undefined") return null;

    const savedAttendance = localStorage.getItem("todayAttendance");
    if (!savedAttendance) return null;

    try {
      const data = JSON.parse(savedAttendance);
      const today = new Date().toISOString().split("T")[0];
      return data.date === today ? data : null;
    } catch {
      return null;
    }
  });

  // =====================================================
  // ATTENDANCE STATUS
  //
  // false = teacher has NOT taken attendance today
  // true  = teacher HAS taken attendance today
  //
  // Later the backend will provide this value.
  // =====================================================

const attendanceTaken = attendance !== null;

  // =====================================================
  // STUDENT COUNTS
  // =====================================================

  const totalStudents = attendance
  ? attendance.students.length
  : students.length;

const presentStudents = attendance
  ? attendance.present
  : 0;

const absentStudents = attendance
  ? attendance.absent
  : 0;

const lateStudents = attendance
  ? attendance.late
  : 0;


  return (

    <div className="teacher-dashboard">


      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="teacher-sidebar">


        {/* LOGO */}

        <div className="sidebar-logo">

          <div className="sidebar-logo-mark">
            JM
          </div>

          <div>
            <h2>
              Jafar Madrasa
            </h2>

            <span>
              Management
            </span>
          </div>

        </div>


        {/* NAVIGATION */}

        <nav className="sidebar-navigation">

          <Link
            href="/management/teacher/dashboard"
            className="sidebar-link active"
          >
            <span>⌂</span>
            Dashboard
          </Link>


          <Link
            href="/management/teacher/students"
            className="sidebar-link"
          >
            <span>♙</span>
            Students
          </Link>


          <Link
            href="/management/teacher/attendance"
            className="sidebar-link"
          >
            <span>✓</span>
            Attendance
          </Link>


          <Link
            href="/management/teacher/progress"
            className="sidebar-link"
          >
            <span>▤</span>
            Quran Progress
          </Link>


          <Link
            href="/management/teacher/reports"
            className="sidebar-link"
          >
            <span>▥</span>
            Reports
          </Link>

        </nav>


        {/* SIDEBAR BOTTOM */}

        <div className="sidebar-bottom">

          <Link
            href="/management/teacher/settings"
            className="sidebar-link"
          >
            <span>⚙</span>
            Settings
          </Link>


          <button
            className="logout-button"
            type="button"
          >
            <span>↪</span>
            Logout
          </button>

        </div>

      </aside>


      {/* =================================================
          MAIN DASHBOARD
      ================================================= */}

      <main className="dashboard-main">


        {/* =================================================
            HEADER
        ================================================= */}

        <header className="dashboard-header">


          <div className="mobile-brand">
            Jafar Madrasa
          </div>


          <div className="header-actions">


            {/* NOTIFICATION */}

            <button
              className="notification-button"
              type="button"
              aria-label="Notifications"
            >
              🔔

              <span className="notification-dot"></span>

            </button>


            {/* TEACHER PROFILE */}

            <div className="teacher-profile">

              <div className="teacher-avatar">
                AM
              </div>


              <div className="teacher-profile-info">

                <strong>
                  {teacher.name}
                </strong>

                <span>
                  Teacher
                </span>

              </div>

            </div>

          </div>

        </header>


        {/* =================================================
            DASHBOARD CONTENT
        ================================================= */}

        <div className="dashboard-content">


          {/* =================================================
              WELCOME SECTION
          ================================================= */}

          <section className="welcome-section">


            <div>

              <p className="dashboard-label">
                TEACHER DASHBOARD
              </p>


              <h1>
                Good morning,{" "}
                {teacher.name.split(" ")[0]}!
              </h1>


              <p>
                Here&apos;s an overview of your students
                and today&apos;s attendance.
              </p>

            </div>


            <div className="branch-badge">
              {teacher.branch}
            </div>

          </section>


          {/* =================================================
              ATTENDANCE / STATISTICS
          ================================================= */}

          <section className="statistics-grid">


            {!attendanceTaken ? (

              /* ==========================================
                 ATTENDANCE NOT TAKEN
              ========================================== */

              <div className="attendance-not-taken-card">


                <div className="attendance-not-taken-icon">
                  ✓
                </div>


                <div className="attendance-not-taken-content">

                  <h3>
                    Today&apos;s attendance has not been taken yet
                  </h3>


                  <p>
                    Record today&apos;s attendance to see your
                    students&apos; present, absent, and late status.
                  </p>

                </div>


                <Link
                  href="/management/teacher/attendance"
                  className="take-attendance-button"
                >
                  Take Attendance →
                </Link>

              </div>

            ) : (

              /* ==========================================
                 ATTENDANCE HAS BEEN TAKEN
              ========================================== */

              <>

                {/* TOTAL STUDENTS */}

                <div className="stat-card">

                  <div className="stat-card-top">

                    <span>
                      Total Students
                    </span>


                    <div className="stat-icon students-icon">
                      S
                    </div>

                  </div>


                  <strong>
                    {totalStudents}
                  </strong>


                  <p>
                    Students assigned to you
                  </p>

                </div>


                {/* PRESENT */}

                <div className="stat-card">

                  <div className="stat-card-top">

                    <span>
                      Present Today
                    </span>


                    <div className="stat-icon present-icon">
                      ✓
                    </div>

                  </div>


                  <strong>
                    {presentStudents}
                  </strong>


                  <p>
                    Students present today
                  </p>

                </div>


                {/* ABSENT */}

                <div className="stat-card">

                  <div className="stat-card-top">

                    <span>
                      Absent Today
                    </span>


                    <div className="stat-icon absent-icon">
                      A
                    </div>

                  </div>


                  <strong>
                    {absentStudents}
                  </strong>


                  <p>
                    Students absent today
                  </p>

                </div>


                {/* LATE */}

                <div className="stat-card">

                  <div className="stat-card-top">

                    <span>
                      Late Today
                    </span>


                    <div className="stat-icon late-icon">
                      L
                    </div>

                  </div>


                  <strong>
                    {lateStudents}
                  </strong>


                  <p>
                    Students marked late
                  </p>

                </div>

              </>

            )}

          </section>


          {/* =================================================
              QUICK ACTIONS
          ================================================= */}

          <section className="quick-actions-section">


            <div className="section-heading">

              <div>

                <h2>
                  Quick Actions
                </h2>

                <p>
                  Manage your students quickly.
                </p>

              </div>

            </div>


            <div className="quick-actions">


              {/* VIEW STUDENTS */}

              <Link
                href="/management/teacher/students"
                className="quick-action"
              >

                <div className="quick-action-icon">
                  S
                </div>


                <div>

                  <strong>
                    View Students
                  </strong>


                  <span>
                    View and manage your students
                  </span>

                </div>


                <span className="action-arrow">
                  →
                </span>

              </Link>


              {/* ATTENDANCE */}

              <Link
                href="/management/teacher/attendance"
                className="quick-action"
              >

                <div className="quick-action-icon">
                  ✓
                </div>


                <div>

                  <strong>
                    Take Attendance
                  </strong>


                  <span>
                    Record today&apos;s attendance
                  </span>

                </div>


                <span className="action-arrow">
                  →
                </span>

              </Link>


              {/* QURAN PROGRESS */}

              <Link
                href="/management/teacher/progress"
                className="quick-action"
              >

                <div className="quick-action-icon">
                  Q
                </div>


                <div>

                  <strong>
                    Record Quran Progress
                  </strong>


                  <span>
                    Record what students learned
                  </span>

                </div>


                <span className="action-arrow">
                  →
                </span>

              </Link>

            </div>

          </section>


          {/* =================================================
              TODAY'S STUDENTS
          ================================================= */}

          <section className="students-section">


            <div className="section-heading">


              <div>

                <h2>
                  Today&apos;s Students
                </h2>


                <p>
                  Your assigned students and today&apos;s status.
                </p>

              </div>


              <Link
                href="/management/teacher/students"
                className="view-all"
              >
                View All →
              </Link>

            </div>


            <div className="students-table-container">


              <table className="students-table">


                <thead>

                  <tr>

                    <th>
                      Student
                    </th>

                    <th>
                      Attendance
                    </th>

                    <th>
                      Quran Progress
                    </th>

                    <th>
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody>


                  {students.map((student) => (

                    <tr key={student.id}>


                      {/* STUDENT */}

                      <td>

                        <div className="student-name">

                          <div className="student-avatar">

                            {student.name
                              .split(" ")
                              .map((word) => word[0])
                              .join("")
                              .slice(0, 2)}

                          </div>


                          <span>
                            {student.name}
                          </span>

                        </div>

                      </td>


                      {/* ATTENDANCE */}

                      <td>

                        {attendanceTaken ? (

                          <span
                            className={`attendance-status ${student.attendance.toLowerCase()}`}
                          >
                            {student.attendance}
                          </span>

                        ) : (

                          <span className="not-recorded">
                            Attendance not taken
                          </span>

                        )}

                      </td>


                      {/* QURAN PROGRESS */}

                      <td>

                        <span className="progress-text">
                          {student.progress}
                        </span>

                      </td>


                      {/* ACTION */}

                      <td>

                        <Link
                          href={`/management/teacher/students/${student.id}`}
                          className="student-action"
                        >
                          View
                        </Link>

                      </td>

                    </tr>

                  ))}


                </tbody>

              </table>

            </div>

          </section>

        </div>

      </main>

    </div>
  );
}