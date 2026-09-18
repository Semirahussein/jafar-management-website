
"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">

      {/* LOGO */}
      <div className="navbar-logo">
        <Link href="/">
          Jafaru Toyar Madrasa
        </Link>
      </div>


      {/* DESKTOP NAVIGATION */}
      <div className="navbar-links">

        <Link href="/">
          Home
        </Link>

        <Link href="/about">
          About Us
        </Link>

        <Link href="/programs">
          Programs
        </Link>

        <Link href="/gallery">
          Gallery
        </Link>

        <Link href="/contact">
          Contact Us
        </Link>

      </div>


      {/* APPLY BUTTON */}
      <Link
        href="/apply"
        className="navbar-apply"
      >
        Apply Now
      </Link>


      {/* MOBILE MENU BUTTON */}
      <button
        className="mobile-menu-button"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle navigation menu"
      >
        ☰
      </button>


      {/* MOBILE NAVIGATION */}
      {menuOpen && (
        <div className="mobile-menu">

          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
          >
            Home
          </Link>

          <Link
            href="/about"
            onClick={() => setMenuOpen(false)}
          >
            About Us
          </Link>

          <Link
            href="/programs"
            onClick={() => setMenuOpen(false)}
          >
            Programs
          </Link>

          <Link
            href="/gallery"
            onClick={() => setMenuOpen(false)}
          >
            Gallery
          </Link>

          <Link
            href="/contact"
            onClick={() => setMenuOpen(false)}
          >
            Contact Us
          </Link>

          <Link
            href="/apply"
            className="mobile-apply"
            onClick={() => setMenuOpen(false)}
          >
            Apply Now
          </Link>

        </div>
      )}

    </nav>
  );
}

