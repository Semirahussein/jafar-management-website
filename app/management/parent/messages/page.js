"use client";

import { useState } from "react";
import "./messages.css";

const initialMessages = [
  {
    id: 1,
    sender: "Ustadhah Fatima",
    subject: "Weekly progress update",
    preview: "Maryam showed good improvement in pronunciation and memorisation this week.",
    time: "2 hours ago",
    unread: true,
  },
  {
    id: 2,
    sender: "Admin office",
    subject: "Upcoming parent meeting",
    preview: "We are looking forward to meeting you on Thursday evening.",
    time: "Yesterday",
    unread: false,
  },
  {
    id: 3,
    sender: "Ustadhah Fatima",
    subject: "Follow-up for revision",
    preview: "Please encourage Maryam to review Al-Mulk and continue the recitation practice at home.",
    time: "3 days ago",
    unread: false,
  },
];

export default function ParentMessagesPage() {
  const [messages, setMessages] = useState(initialMessages);

  const handleSelect = (id) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? { ...message, unread: false } : message
      )
    );
  };

  return (
    <div>
      <h1 className="parent-section-title">Messages</h1>
      <p className="parent-subtitle">Private updates from your child&apos;s teacher and the madrasa office.</p>

      <div className="messages-panel">
        {messages.map((message) => (
          <button
            key={message.id}
            type="button"
            className={`message-card ${message.unread ? "unread" : ""}`}
            onClick={() => handleSelect(message.id)}
          >
            <div className="message-head">
              <div>
                <strong>{message.sender}</strong>
                <span>{message.subject}</span>
              </div>
              <time>{message.time}</time>
            </div>

            <p>{message.preview}</p>
            {message.unread ? <span className="message-badge">New</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
