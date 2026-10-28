"use client";

import "./announcements.css";

const announcements = [
  {
    id: 1,
    title: "Parent meeting scheduled",
    date: "October 21, 2026",
    type: "General",
    content: "We would like to invite all parents to the term meeting on Thursday at 6:30 PM. Please be ready to review your child’s progress and ask questions about the term plan.",
  },
  {
    id: 2,
    title: "School closed for public holiday",
    date: "October 24, 2026",
    type: "Notice",
    content: "The madrasa will be closed on Monday for the public holiday. Classes will resume on Tuesday at the usual time.",
  },
  {
    id: 3,
    title: "Quran revision workshop",
    date: "October 27, 2026",
    type: "Event",
    content: "A short revision workshop will be held for Level 2 students to practise memorisation and improve recitation clarity.",
  },
];

export default function ParentAnnouncementsPage() {
  return (
    <div>
      <h1 className="parent-section-title">Announcements</h1>
      <p className="parent-subtitle">Latest updates and notices from the madrasa.</p>

      <div className="announcement-list">
        {announcements.map((item) => (
          <article key={item.id} className="announcement-card">
            <div className="announcement-heading">
              <span className="announcement-type">{item.type}</span>
              <span className="announcement-date">{item.date}</span>
            </div>

            <h2>{item.title}</h2>
            <p>{item.content}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
