"use client";

import Link from "next/link";
import "./dashboard.css";

const childSummary = {
  name: "Maryam A/Rahman",
  classLevel: "Level 2",
  attendance: 92,
  quran: "10/15 Surahs",
  weeklySummary: "Maryam is progressing steadily in recitation and has improved in pronunciation this week.",
  nextFocus: "Continue memorising the next section of Al-Mulk and review Tajweed rules for long vowels.",
  unread: 3,
  alerts: 2,
};

const announcements = [
  { id: 1, title: "Parent meeting", detail: "Thursday, 6:30 PM at the main hall.", time: "Today" },
  { id: 2, title: "Quran revision class", detail: "Extra practice for Level 2 students on Saturday.", time: "2 days ago" },
];

const messagePreview = [
  { id: 1, from: "Ustadh Fatima", detail: "Maryam did well in class today and completed her revision practice.", time: "2h ago" },
  { id: 2, from: "Admin office", detail: "School holiday reminder for next Monday.", time: "Yesterday" },
];

export default function ParentDashboardPage() {
  return (
    <div>
      <h1 className="parent-section-title">Parent dashboard</h1>
      <p className="parent-subtitle">Overview of your child&apos;s learning and communication.</p>

      <section className="dashboard-overview-grid">
        <article className="stat-card accent">
          <div className="stat-header">
            <span className="stat-label">Child</span>
            <span className="stat-icon">♙</span>
          </div>
          <strong>{childSummary.name}</strong>
          <p>{childSummary.classLevel}</p>
        </article>

        <article className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Attendance</span>
            <span className="stat-icon">✓</span>
          </div>
          <strong>{childSummary.attendance}%</strong>
          <p>Current month</p>
        </article>

        <article className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Quran</span>
            <span className="stat-icon">◌</span>
          </div>
          <strong>{childSummary.quran}</strong>
          <p>Progress this term</p>
        </article>

        <article className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Unread</span>
            <span className="stat-icon">✉</span>
          </div>
          <strong>{childSummary.unread}</strong>
          <p>Messages and updates</p>
        </article>
      </section>

      <section className="dashboard-two-column">
        <div className="panel-card">
          <div className="panel-header">
            <h2>Weekly progress summary</h2>
            <Link href="/management/parent/child">View details</Link>
          </div>

          <p className="summary-text">{childSummary.weeklySummary}</p>

          <div className="focus-box">
            <p className="focus-label">Next focus</p>
            <strong>{childSummary.nextFocus}</strong>
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <h2>Announcements</h2>
            <Link href="/management/parent/announcements">See all</Link>
          </div>

          <ul className="list-stack">
            {announcements.map((announcement) => (
              <li key={announcement.id} className="list-item">
                <div>
                  <strong>{announcement.title}</strong>
                  <p>{announcement.detail}</p>
                </div>
                <span>{announcement.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="dashboard-two-column last">
        <div className="panel-card">
          <div className="panel-header">
            <h2>Latest messages</h2>
            <Link href="/management/parent/messages">Open inbox</Link>
          </div>

          <ul className="list-stack">
            {messagePreview.map((message) => (
              <li key={message.id} className="list-item">
                <div>
                  <strong>{message.from}</strong>
                  <p>{message.detail}</p>
                </div>
                <span>{message.time}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <h2>Alerts</h2>
            <span className="panel-badge">{childSummary.alerts}</span>
          </div>

          <div className="alert-box">
            <span className="alert-dot" aria-hidden="true">!</span>
            <p>One attendance update is waiting for your review this week.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
