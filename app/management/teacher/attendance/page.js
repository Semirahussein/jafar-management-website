"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "./attendance.css";

export default function AttendancePage() {
    const router = useRouter();

  
    const [students, setStudents] = useState([
    {
      id: 1,
      name: "Aisha Ahmed",
      attendance: "",
    },
    {
      id: 2,
      name: "Maryam Ali",
      attendance: "",
    },
    {
      id: 3,
      name: "Fatima Omar",
      attendance: "",
    },
    {
      id: 4,
      name: "Hafsa Mohammed",
      attendance: "",
    },
    {
      id: 5,
      name: "Khadija Hassan",
      attendance: "",
    },
  ]);

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [submitted, setSubmitted] = useState(false);


  // Select attendance status
  const handleAttendance = (studentId, status) => {
    setStudents((currentStudents) =>
      currentStudents.map((student) =>
        student.id === studentId
          ? {
              ...student,
              attendance: status,
            }
          : student
      )
    );
  };


  // Count attendance
  const presentCount = students.filter(
    (student) => student.attendance === "present"
  ).length;

  const lateCount = students.filter(
    (student) => student.attendance === "late"
  ).length;

  const absentCount = students.filter(
    (student) => student.attendance === "absent"
  ).length;


  // Check whether every student has attendance
  const allStudentsMarked = students.every(
    (student) => student.attendance !== ""
  );


  // Open confirmation
  const handleSubmit = (event) => {
    event.preventDefault();

    if (!allStudentsMarked) {
      alert(
        "Please mark attendance for every student before submitting."
      );
      return;
    }

    setShowConfirmation(true);
  };


  // Confirm attendance
 const confirmAttendance = () => {
  const attendanceData = {
    date: new Date().toISOString().split("T")[0],
    students: students,
    present: presentCount,
    late: lateCount,
    absent: absentCount,
  };

  localStorage.setItem(
    "todayAttendance",
    JSON.stringify(attendanceData)
  );

  setShowConfirmation(false);
  setSubmitted(true);

  console.log("Attendance submitted:", attendanceData);
};

  // Today's date
  const today = new Date();

  const formattedDate = today.toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );


  return (
    <main className="attendance-page">

      {/* HEADER */}

      <header className="attendance-header">

        <div>
          <p className="attendance-label">
            TEACHER PORTAL
          </p>

          <h1>
            Take Attendance
          </h1>

          <p className="attendance-subtitle">
            Record today&apos;s attendance for your students.
          </p>
        </div>


        <div className="attendance-date">
          <span>
            Date
          </span>

          <strong>
            {formattedDate}
          </strong>
        </div>

      </header>


      {/* MAIN CONTENT */}

      {!submitted ? (

        <form
          className="attendance-container"
          onSubmit={handleSubmit}
        >

          {/* STUDENT LIST */}

          <section className="attendance-card">

            <div className="attendance-card-header">

              <div>
                <h2>
                  Student Attendance
                </h2>

                <p>
                  Select one attendance status for
                  each student.
                </p>
              </div>

              <span className="student-count">
                {students.length} Students
              </span>

            </div>


            {/* TABLE */}

            <div className="attendance-table">

              <div className="table-header">

                <span>
                  Student
                </span>

                <span>
                  Attendance
                </span>

              </div>


              {dashboardStudents.map((student) => (

                <div
                  className="student-row"
                  key={student.id}
                >

                  <div className="student-info">

                    <div className="student-avatar">
                      {student.name.charAt(0)}
                    </div>

                    <span>
                      {student.name}
                    </span>

                  </div>


                  <div className="attendance-options">

                    {/* PRESENT */}

                    <button
                      type="button"
                      className={`attendance-option present ${
                        student.attendance ===
                        "present"
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        handleAttendance(
                          student.id,
                          "present"
                        )
                      }
                    >
                      Present
                    </button>


                    {/* LATE */}

                    <button
                      type="button"
                      className={`attendance-option late ${
                        student.attendance ===
                        "late"
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        handleAttendance(
                          student.id,
                          "late"
                        )
                      }
                    >
                      Late
                    </button>


                    {/* ABSENT */}

                    <button
                      type="button"
                      className={`attendance-option absent ${
                        student.attendance ===
                        "absent"
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        handleAttendance(
                          student.id,
                          "absent"
                        )
                      }
                    >
                      Absent
                    </button>

                  </div>

                </div>

              ))}

            </div>

          </section>


          {/* SUMMARY */}

          <section className="attendance-summary">

            <div className="summary-item">

              <span className="summary-number">
                {presentCount}
              </span>

              <span className="summary-label">
                Present
              </span>

            </div>


            <div className="summary-item">

              <span className="summary-number">
                {lateCount}
              </span>

              <span className="summary-label">
                Late
              </span>

            </div>


            <div className="summary-item">

              <span className="summary-number">
                {absentCount}
              </span>

              <span className="summary-label">
                Absent
              </span>

            </div>

          </section>


          {/* SUBMIT */}

          <div className="attendance-actions">

            <button
              type="submit"
              className="submit-attendance"
            >
              Submit Attendance
            </button>

          </div>

        </form>

      ) : (

        /* SUCCESS */

        <section className="attendance-success">

          <div className="success-icon">
            ✓
          </div>

          <h2>
            Attendance Submitted Successfully
          </h2>

          <p>
            Today&apos;s attendance has been recorded
            successfully.
          </p>


          <div className="success-summary">

            <div>
              <strong>
                {presentCount}
              </strong>

              <span>
                Present
              </span>
            </div>

            <div>
              <strong>
                {lateCount}
              </strong>

              <span>
                Late
              </span>
            </div>

            <div>
              <strong>
                {absentCount}
              </strong>

              <span>
                Absent
              </span>
            </div>

          </div>


          <button
            className="back-dashboard"
            onClick={() => router.push("/management/teacher/dashboard")}
          >
            Back to Dashboard
          </button>

        </section>

      )}


      {/* CONFIRMATION MODAL */}

      {showConfirmation && (

        <div className="confirmation-overlay">

          <div className="confirmation-modal">

            <button
              className="close-confirmation"
              onClick={() =>
                setShowConfirmation(false)
              }
            >
              ×
            </button>


            <div className="confirmation-icon">
              ?
            </div>


            <h2>
              Submit Attendance?
            </h2>

            <p>
              You are about to submit today&apos;s
              attendance for all students.
            </p>


            <div className="confirmation-summary">

              <div>
                <strong>
                  {presentCount}
                </strong>

                <span>
                  Present
                </span>
              </div>

              <div>
                <strong>
                  {lateCount}
                </strong>

                <span>
                  Late
                </span>
              </div>

              <div>
                <strong>
                  {absentCount}
                </strong>

                <span>
                  Absent
                </span>
              </div>

            </div>


            <div className="confirmation-actions">

              <button
                type="button"
                className="cancel-button"
                onClick={() =>
                  setShowConfirmation(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="confirm-button"
                onClick={confirmAttendance}
              >
                Confirm Attendance
              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}