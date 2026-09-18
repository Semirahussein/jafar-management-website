
"use client";

import { useState } from "react";

export default function ContactForm() {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();

    // replace this with backend API request.

    setShowSuccess(true);

    // Clear the form
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
            <label htmlFor="name">
              Full Name
            </label>

            <input
              type="text"
              id="name"
              name="name"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">
              Email Address
            </label>

            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email"
              required
            />
          </div>

        </div>


        <div className="form-group">

          <label htmlFor="phone">
            Phone Number
          </label>

          <input
            type="tel"
            id="phone"
            name="phone"
            placeholder="+251 XX XXX XXXX"
          />

        </div>


        <div className="form-group">

          <label htmlFor="subject">
            Subject
          </label>

          <select
            id="subject"
            name="subject"
            required
          >
            <option value="">
              Select a subject
            </option>

            <option value="admission">
              Admission
            </option>

            <option value="programs">
              Programs
            </option>

            <option value="quran">
              Quran Education
            </option>

            <option value="branch">
              Branch Information
            </option>

            <option value="general">
              General Inquiry
            </option>
          </select>

        </div>


        <div className="form-group">

          <label htmlFor="message">
            Your Message
          </label>

          <textarea
            id="message"
            name="message"
            rows="6"
            placeholder="Write your message here..."
            required
          ></textarea>

        </div>


        <button
          type="submit"
          className="contact-submit-button"
        >
          Send Message →
        </button>

      </form>


      {/* SUCCESS OVERLAY */}

      {showSuccess && (
        <div className="success-overlay">

          <div className="success-modal">

            <button
              className="success-close"
              onClick={closeSuccess}
              aria-label="Close"
            >
              ×
            </button>

            <div className="success-icon">
              ✓
            </div>

            <h2>
              Message Sent!
            </h2>

            <p>
              Thank you for contacting Jafar Madrasa.
              Your message has been successfully submitted.
            </p>

            <button
              className="success-button"
              onClick={closeSuccess}
            >
              Done
            </button>

          </div>

        </div>
      )}

    </>
  );
}

