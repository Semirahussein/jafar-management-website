"use client";

import "./child.css";

const childData = {
  name: "Maryam A/Rahman",
  age: 12,
  level: "Level 2",
  teacher: "Ustadhah Fatima Ahmed",
  branch: "Main Branch",
  lastAttendance: "Present",
  weeklyMood: "Focused and confident",
  notes: "Maryam is making good progress in Quran recitation and continues to improve her pronunciation and memorisation consistency.",
};

const attendanceHistory = [
  { day: "Mon", status: "Present" },
  { day: "Tue", status: "Present" },
  { day: "Wed", status: "Late" },
  { day: "Thu", status: "Present" },
  { day: "Fri", status: "Present" },
];

const quranProgress = [
  { surah: "Al-Fatihah", mark: "Complete", detail: "Reviewed and recited with accuracy" },
  { surah: "Al-Baqarah", mark: "In progress", detail: "Memorisation improving steadily" },
  { surah: "Al-Imran", mark: "New", detail: "Started memorising from verse 1-10" },
];

export default function ParentChildPage() {
  return (
    <div>
      <h1 className="parent-section-title">My child</h1>
      <p className="parent-subtitle">Daily learning updates and academic progress.</p>

      <section className="child-summary-grid">
        <article className="child-card info-card">
          <div className="profile-badge">MR</div>
          <div>
            <strong>{childData.name}</strong>
            <p>{childData.level} • {childData.age} years old</p>
          </div>
        </article>

        <article className="child-card">
          <span className="card-label">Teacher</span>
          <strong>{childData.teacher}</strong>
        </article>

        <article className="child-card">
          <span className="card-label">Branch</span>
          <strong>{childData.branch}</strong>
        </article>
      </section>

      <section className="child-content-grid">
        <div className="panel-card">
          <div className="panel-header">
            <h2>Attendance</h2>
            <span className="status-pill success">{childData.lastAttendance}</span>
          </div>

          <div className="attendance-mini-grid">
            {attendanceHistory.map((entry) => (
              <div key={entry.day} className="attendance-day">
                <span>{entry.day}</span>
                <strong className={entry.status === "Late" ? "late" : "present"}>{entry.status}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <h2>Weekly wellbeing</h2>
          </div>

          <div className="wellbeing-box">
            <p className="wellbeing-label">Teacher note</p>
            <strong>{childData.weeklyMood}</strong>
            <p>{childData.notes}</p>
          </div>
        </div>
      </section>

      <section className="panel-card full-width">
        <div className="panel-header">
          <h2>Quran progress</h2>
          <span className="panel-link">Updated today</span>
        </div>

        <div className="progress-list">
          {quranProgress.map((item) => (
            <div key={item.surah} className="progress-row">
              <div>
                <strong>{item.surah}</strong>
                <p>{item.detail}</p>
              </div>
              <span className="progress-tag">{item.mark}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
