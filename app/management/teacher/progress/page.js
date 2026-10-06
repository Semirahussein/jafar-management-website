"use client";

import { useState } from "react";
import Link from "next/link";
import "./progress.css";

const students = [
  {
    id: 1,
    name: "Aisha Ahmed",
    level: "Level 1",
  },
  {
    id: 2,
    name: "Maryam Ali",
    level: "Level 1",
  },
  {
    id: 3,
    name: "Yusuf Mohammed",
    level: "Level 2",
  },
  {
    id: 4,
    name: "Fatima Hassan",
    level: "Level 2",
  },
  {
    id: 5,
    name: "Abdullah Omar",
    level: "Level 3",
  },
];

const surahs = [
  "Al-Fatihah",
  "Al-Baqarah",
  "Aal-E-Imran",
  "An-Nisa",
  "Al-Ma'idah",
  "Al-An'am",
  "Al-A'raf",
  "Al-Anfal",
  "At-Tawbah",
  "Yunus",
  "Hud",
  "Yusuf",
  "Ar-Ra'd",
  "Ibrahim",
  "Al-Hijr",
  "An-Nahl",
  "Al-Isra",
  "Al-Kahf",
  "Maryam",
  "Ta-Ha",
  "Al-Anbiya",
  "Al-Hajj",
  "Al-Mu'minun",
  "An-Nur",
  "Al-Furqan",
  "Ash-Shu'ara",
  "An-Naml",
  "Al-Qasas",
  "Al-Ankabut",
  "Ar-Rum",
  "Luqman",
  "As-Sajdah",
  "Al-Ahzab",
  "Saba",
  "Fatir",
  "Ya-Sin",
  "As-Saffat",
  "Sad",
  "Az-Zumar",
  "Ghafir",
  "Fussilat",
  "Ash-Shura",
  "Az-Zukhruf",
  "Ad-Dukhan",
  "Al-Jathiyah",
  "Al-Ahqaf",
  "Muhammad",
  "Al-Fath",
  "Al-Hujurat",
  "Qaf",
  "Adh-Dhariyat",
  "At-Tur",
  "An-Najm",
  "Al-Qamar",
  "Ar-Rahman",
  "Al-Waqi'ah",
  "Al-Hadid",
  "Al-Mujadilah",
  "Al-Hashr",
  "Al-Mumtahanah",
  "As-Saff",
  "Al-Jumu'ah",
  "Al-Munafiqun",
  "At-Taghabun",
  "At-Talaq",
  "At-Tahrim",
  "Al-Mulk",
  "Al-Qalam",
  "Al-Haqqah",
  "Al-Ma'arij",
  "Nuh",
  "Al-Jinn",
  "Al-Muzzammil",
  "Al-Muddaththir",
  "Al-Qiyamah",
  "Al-Insan",
  "Al-Mursalat",
  "An-Naba",
  "An-Nazi'at",
  "Abasa",
  "At-Takwir",
  "Al-Infitar",
  "Al-Mutaffifin",
  "Al-Inshiqaq",
  "Al-Buruj",
  "At-Tariq",
  "Al-A'la",
  "Al-Ghashiyah",
  "Al-Fajr",
  "Al-Balad",
  "Ash-Shams",
  "Al-Layl",
  "Ad-Duha",
  "Ash-Sharh",
  "At-Tin",
  "Al-Alaq",
  "Al-Qadr",
  "Al-Bayyinah",
  "Az-Zalzalah",
  "Al-Adiyat",
  "Al-Qari'ah",
  "At-Takathur",
  "Al-Asr",
  "Al-Humazah",
  "Al-Fil",
  "Quraysh",
  "Al-Ma'un",
  "Al-Kawthar",
  "Al-Kafirun",
  "An-Nasr",
  "Al-Masad",
  "Al-Ikhlas",
  "Al-Falaq",
  "An-Nas",
];

export default function QuranProgressPage() {
  const [selectedStudent, setSelectedStudent] = useState("");
  const [surah, setSurah] = useState("");
  const [ayahFrom, setAyahFrom] = useState("");
  const [ayahTo, setAyahTo] = useState("");
  const [remark, setRemark] = useState("");

  // Success feedback
  const [showSuccess, setShowSuccess] = useState(false);
  const [successStudent, setSuccessStudent] = useState("");

  const handleSubmit = (event) => {
  event.preventDefault();

  // Get the selected student
  const student = students.find(
    (student) => student.id === Number(selectedStudent)
  );

  // Check required fields
  if (!student || !surah || !ayahFrom || !ayahTo) {
    alert("Please fill in all required fields.");
    return;
  }

  // Create the progress record
  const progressRecord = {
    id: Date.now(),
    studentId: student.id,
    studentName: student.name,
    date: new Date().toISOString().split("T")[0],
    surah: surah,
    ayahFrom: ayahFrom,
    ayahTo: ayahTo,
    remark: remark,
  };

  // Get existing records
  const existingProgress = JSON.parse(
    localStorage.getItem("quranProgress") || "[]"
  );

  // Save the new record
  localStorage.setItem(
    "quranProgress",
    JSON.stringify([
      ...existingProgress,
      progressRecord,
    ])
  );

  // IMPORTANT:
  // Set success information
  setSuccessStudent(student.name);
  setShowSuccess(true);

  // Clear the form
  setSelectedStudent("");
  setSurah("");
  setAyahFrom("");
  setAyahTo("");
  setRemark("");
};

  return (
    <main className="quran-progress-page">

      {/* =========================
          PAGE HEADER
      ========================= */}

      <div className="progress-header">

        <div>
          <span className="page-label">
            QURAN EDUCATION
          </span>

          <h1>
            Quran Progress
          </h1>

          <p>
            Record and track your students&apos; daily Quran
            learning progress.
          </p>
        </div>
        <div className="progress-header-right">

    <Link
      href="/management/teacher/dashboard"
      className="back-dashboard-button"
    >
      ← Back to Dashboard
    </Link>
</div>

        <div className="today-date">

          <span>
            Today&apos;s Date
          </span>

          <strong>
            {new Date().toLocaleDateString(
              "en-US",
              {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            )}
          </strong>

        </div>

      </div>


      {/* =========================
          PROGRESS FORM CARD
      ========================= */}

      <section className="progress-card">

        <div className="card-header">

          <div>

            <h2>
              Record Daily Progress
            </h2>

            <p>
              Enter the Quran progress completed by
              the student today.
            </p>

          </div>

        </div>


        <form
          className="progress-form"
          onSubmit={handleSubmit}
        >

          {/* STUDENT */}

          <div className="form-group">

            <label htmlFor="student">

              Student

              <span className="required">
                *
              </span>

            </label>

            <select
              id="student"
              value={selectedStudent}
              onChange={(event) =>
                setSelectedStudent(
                  event.target.value
                )
              }
              required
            >

              <option value="">
                Select a student
              </option>

              {students.map((student) => (

                <option
                  key={student.id}
                  value={student.id}
                >
                  {student.name} — {student.level}
                </option>

              ))}

            </select>

          </div>


          {/* SURAH */}

          <div className="form-group">

            <label htmlFor="surah">

              Surah

              <span className="required">
                *
              </span>

            </label>

            <select
              id="surah"
              value={surah}
              onChange={(event) =>
                setSurah(event.target.value)
              }
              required
            >

              <option value="">
                Select a Surah
              </option>

              {surahs.map((surahName) => (

                <option
                  key={surahName}
                  value={surahName}
                >
                  {surahName}
                </option>

              ))}

            </select>

          </div>


          {/* AYAH RANGE */}

          <div className="ayah-row">

            <div className="form-group">

              <label htmlFor="ayahFrom">

                Ayah From

                <span className="required">
                  *
                </span>

              </label>

              <input
                type="number"
                id="ayahFrom"
                min="1"
                value={ayahFrom}
                onChange={(event) =>
                  setAyahFrom(
                    event.target.value
                  )
                }
                placeholder="e.g. 1"
                required
              />

            </div>


            <div className="range-arrow">
              →
            </div>


            <div className="form-group">

              <label htmlFor="ayahTo">

                Ayah To

                <span className="required">
                  *
                </span>

              </label>

              <input
                type="number"
                id="ayahTo"
                min="1"
                value={ayahTo}
                onChange={(event) =>
                  setAyahTo(
                    event.target.value
                  )
                }
                placeholder="e.g. 5"
                required
              />

            </div>

          </div>


          {/* REMARK */}

          <div className="form-group">

            <label htmlFor="remark">
              Remark
            </label>

            <textarea
              id="remark"
              value={remark}
              onChange={(event) =>
                setRemark(event.target.value)
              }
              rows="5"
              placeholder="Write a remark about the student's progress..."
            />

            <small>
              You can mention reading quality,
              memorization, Tajweed, areas for
              improvement, or other observations.
            </small>

          </div>


          {/* SAVE BUTTON */}

          <div className="form-actions">

            <button
              type="submit"
              className="save-progress-button"
            >
              Save Progress
            </button>

          </div>

        </form>

      </section>


      {/* =========================
          INFORMATION CARD
      ========================= */}

      <section className="progress-info">

        <div className="info-icon">
          i
        </div>

        <div>

          <h3>
            Recording Progress
          </h3>

          <p>
            Make sure the Surah and Ayah range are
            correct before saving. Each saved record
            will be associated with the selected
            student and today&apos;s date.
          </p>

        </div>

      </section>


      {/* =========================
          SUCCESS OVERLAY
      ========================= */}

      {showSuccess && (

        <div className="progress-success-overlay">

          <div className="progress-success-modal">

            {/* CLOSE BUTTON */}

            <button
              type="button"
              className="progress-success-close"
              onClick={() =>
                setShowSuccess(false)
              }
              aria-label="Close"
            >
              ×
            </button>


            {/* SUCCESS ICON */}

            <div className="progress-success-icon">
              ✓
            </div>


            {/* SUCCESS TITLE */}

            <h2>
              Progress Recorded Successfully!
            </h2>


            {/* SUCCESS MESSAGE */}

            <p>
              {successStudent}&apos;s Quran progress
              has been recorded successfully.
            </p>


            {/* DONE BUTTON */}

            <button
              type="button"
              className="progress-success-button"
              onClick={() =>
                setShowSuccess(false)
              }
            >
              Done
            </button>

          </div>

        </div>

      )}

    </main>
  );
}