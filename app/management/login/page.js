"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");


  const handleSubmit = (event) => {
    event.preventDefault();

    console.log("Login button clicked");
    console.log("Username:", username);
    console.log("Password:", password);


    // Temporary demo teacher account

    if (
      username.trim() === "teacher" &&
      password === "123456"
    ) {

      console.log("Login successful");

      router.push("/teacher/dashboard");

    } else {

      alert("Invalid username or password.");

    }
  };


  return (
    <main className="login-page">

      {/* LEFT SIDE - BRANDING */}

      <section className="login-brand">

        <div className="brand-content">

          <div className="brand-logo">
            JM
          </div>

          <h1>
            Jafar Madrasa
          </h1>

          <p className="brand-subtitle">
            Management System
          </p>

          <div className="brand-divider"></div>

          <p className="brand-description">
            A centralized platform for managing students,
            teachers, attendance, Quran progress, and
            communication across Jafar Madrasa branches.
          </p>

          <div className="brand-features">

            <div className="brand-feature">
              <span className="feature-icon">
                ✓
              </span>

              <span>
                Student Management
              </span>
            </div>


            <div className="brand-feature">
              <span className="feature-icon">
                ✓
              </span>

              <span>
                Attendance Tracking
              </span>
            </div>


            <div className="brand-feature">
              <span className="feature-icon">
                ✓
              </span>

              <span>
                Quran Progress Tracking
              </span>
            </div>


            <div className="brand-feature">
              <span className="feature-icon">
                ✓
              </span>

              <span>
                Branch Management
              </span>
            </div>

          </div>

        </div>


        <div className="brand-footer">
          © 2026 Jafar Madrasa
        </div>

      </section>


      {/* RIGHT SIDE - LOGIN */}

      <section className="login-section">

        <div className="login-card">


          <div className="login-header">

            <span className="login-label">
              MANAGEMENT PORTAL
            </span>

            <h2>
              Welcome Back
            </h2>

            <p>
              Sign in to access the Jafar Madrasa
              management system.
            </p>

          </div>


          {/* LOGIN FORM */}

          <form
            className="login-form"
            onSubmit={handleSubmit}
          >


            {/* USERNAME */}

            <div className="input-group">

              <label htmlFor="email">
                Email or Username
              </label>

              <input
                type="text"
                id="email"
                name="email"
                placeholder="Enter your email or username"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                required
              />

            </div>


            {/* PASSWORD */}

            <div className="input-group">

              <div className="password-label">

                <label htmlFor="password">
                  Password
                </label>


                <button
                  type="button"
                  className="forgot-password"
                  onClick={() =>
                    alert(
                      "Password reset will be connected later."
                    )
                  }
                >
                  Forgot password?
                </button>

              </div>


              <div className="password-input">

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  required
                />


                <button
                  type="button"
                  className="show-password"
                  onClick={() =>
                    setShowPassword(
                      (previous) => !previous
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>

              </div>

            </div>


            {/* REMEMBER ME */}

            <div className="login-options">

              <label className="remember-me">

                <input
                  type="checkbox"
                  name="remember"
                />

                <span>
                  Remember me
                </span>

              </label>

            </div>


            {/* LOGIN BUTTON */}

            <button
              type="submit"
              className="login-button"
            >
              Sign In
            </button>

          </form>


          {/* FOOTER */}

          <div className="login-footer">

            <p>
              Authorized personnel only.
            </p>

            <span>
              Jafar Madrasa Management System
            </span>

          </div>


        </div>

      </section>

    </main>
  );
}