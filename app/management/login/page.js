"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/app/lib/api";
import { useAuth } from "../auth-provider";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signOut } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      const user = await signIn(username, password);
      const destinationByRole = {
        ADMINISTRATOR: "/management/admin/dashboard",
        BRANCH_MANAGER: "/management/manager/dashboard",
        QURAN_TEACHER: "/management/teacher/dashboard",
      };
      const destination = destinationByRole[user.role];

      if (!destination) {
        signOut();
        setFormError("This account role is not supported by the management portal.");
        return;
      }

      router.push(destination);
    } catch (error) {
      signOut();
      if (error instanceof ApiError && error.status === 401) {
        setFormError("Incorrect username or password.");
      } else {
        setFormError(
          error instanceof Error
            ? error.message
            : "Unable to connect to the backend."
        );
      }
    } finally {
      setIsSubmitting(false);
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

          <form className="login-form" onSubmit={handleSubmit}>


            {/* USERNAME */}

            <div className="input-group">

              <label htmlFor="email">
                Email or Username
              </label>

              <input
                type="text"
                id="email"
                name="username"
                autoComplete="username"
                placeholder="Enter your username"
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
                  autoComplete="current-password"
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


            {/* LOGIN BUTTON */}

            <button
              type="submit"
              className="login-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in…" : "Sign In"}
            </button>

          </form>


          {formError && (
            <p className="login-form-error" role="alert">
              {formError}
            </p>
          )}

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