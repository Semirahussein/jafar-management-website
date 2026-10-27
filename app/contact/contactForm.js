"use client";

import { useState } from "react";

export default function ContactForm({ messages }) {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setShowSuccess(true);
    event.target.reset();
  };

  const closeSuccess = () => {
    setShowSuccess(false);
  };

  return (
    <>
      <form className="contact-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="name">{messages.fullName}</label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder={messages.namePlaceholder}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">{messages.email}</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder={messages.emailPlaceholder}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="phone">{messages.phone}</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            placeholder={messages.phonePlaceholder}
          />
        </div>

        <div className="form-group">
          <label htmlFor="subject">{messages.subject}</label>
          <select id="subject" name="subject" required>
            <option value="">{messages.selectSubject}</option>
            {messages.subjects.map((subject, index) => (
              <option
                value={["admission", "programs", "quran", "branch", "general"][index]}
                key={subject}
              >
                {subject}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="message">{messages.message}</label>
          <textarea
            id="message"
            name="message"
            rows="6"
            placeholder={messages.messagePlaceholder}
            required
          />
        </div>

        <button type="submit" className="contact-submit-button">
          {messages.send}
        </button>
      </form>

      {showSuccess && (
        <div className="success-overlay">
          <div className="success-modal">
            <button
              className="success-close"
              onClick={closeSuccess}
              aria-label={messages.close}
            >
              ×
            </button>
            <div className="success-icon">✓</div>
            <h2>{messages.sent}</h2>
            <p>{messages.success}</p>
            <button className="success-button" onClick={closeSuccess}>
              {messages.done}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
