"use client";

import { useState } from "react";
import "./settings.css";

const initialPreferences = {
  email: "samira.r@example.com",
  phone: "+966 500 123 456",
  language: "English",
  notifications: true,
};

export default function ParentSettingsPage() {
  const [preferences, setPreferences] = useState(initialPreferences);

  const handleChange = (field, value) => {
    setPreferences((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <div>
      <h1 className="parent-section-title">Settings</h1>
      <p className="parent-subtitle">Manage your family contact and notification preferences.</p>

      <div className="settings-panel">
        <div className="form-row">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={preferences.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />
        </div>

        <div className="form-row">
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            type="tel"
            value={preferences.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
          />
        </div>

        <div className="form-row">
          <label htmlFor="language">Preferred language</label>
          <select
            id="language"
            value={preferences.language}
            onChange={(e) => handleChange("language", e.target.value)}
          >
            <option value="English">English</option>
            <option value="Arabic">Arabic</option>
            <option value="French">French</option>
          </select>
        </div>

        <div className="toggle-row">
          <div>
            <strong>In-app notifications</strong>
            <p>Receive announcements and student updates in the parent portal.</p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={preferences.notifications}
              onChange={(e) => handleChange("notifications", e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>
      </div>
    </div>
  );
}
