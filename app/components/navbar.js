
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const locale = searchParams.get("lang") === "am" ? "am" : "en";
  const labels =
    locale === "am"
      ? {
          home: "መነሻ",
          about: "ስለ እኛ",
          programs: "ፕሮግራሞች",
          gallery: "የፎቶ ማዕከል",
          contact: "ያግኙን",
          login: "ግባ",
          menu: "የዳሰሳ ምናሌን ክፈት",
          brand: "ጃዕፈሩ መድረሳ",
          english: "English",
          amharic: "አማርኛ",
        }
      : {
          home: "Home",
          about: "About Us",
          programs: "Programs",
          gallery: "Gallery",
          contact: "Contact Us",
          login: "LOGIN",
          menu: "Toggle navigation menu",
          brand: "Jafaru Toyar Madrasa",
          english: "English",
          amharic: "አማርኛ",
        };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  if (pathname?.startsWith("/management")) {
    return null;
  }

  const localizedHref = (href) => ({ pathname: href, query: { lang: locale } });

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link href={localizedHref("/")}>{labels.brand}</Link>
      </div>

      <div className="navbar-links">
        <Link href={localizedHref("/")}>{labels.home}</Link>
        <Link href={localizedHref("/about")}>{labels.about}</Link>
        <Link href={localizedHref("/programs")}>{labels.programs}</Link>
        <Link href={localizedHref("/gallery")}>{labels.gallery}</Link>
        <Link href={localizedHref("/contact")}>{labels.contact}</Link>
      </div>

      <div className="navbar-language-toggle" aria-label="Choose language">
        <Link
          href={{ pathname, query: { lang: "en" } }}
          lang="en"
          aria-current={locale === "en" ? "page" : undefined}
        >
          {labels.english}
        </Link>
        <Link
          href={{ pathname, query: { lang: "am" } }}
          lang="am"
          aria-current={locale === "am" ? "page" : undefined}
        >
          {labels.amharic}
        </Link>
      </div>

      <Link href="/management/login" className="navbar-apply">
        {labels.login}
      </Link>

      <button
        className="mobile-menu-button"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label={labels.menu}
        aria-expanded={menuOpen}
      >
        ☰
      </button>

      {menuOpen && (
        <div className="mobile-menu">
          <Link href={localizedHref("/")} onClick={() => setMenuOpen(false)}>
            {labels.home}
          </Link>
          <Link href={localizedHref("/about")} onClick={() => setMenuOpen(false)}>
            {labels.about}
          </Link>
          <Link href={localizedHref("/programs")} onClick={() => setMenuOpen(false)}>
            {labels.programs}
          </Link>
          <Link href={localizedHref("/gallery")} onClick={() => setMenuOpen(false)}>
            {labels.gallery}
          </Link>
          <Link href={localizedHref("/contact")} onClick={() => setMenuOpen(false)}>
            {labels.contact}
          </Link>
          <Link
            href="/management/login"
            className="mobile-apply"
            onClick={() => setMenuOpen(false)}
          >
            {labels.login}
          </Link>
          <div className="mobile-language-toggle" aria-label="Choose language">
            <Link href={{ pathname, query: { lang: "en" } }} lang="en">
              {labels.english}
            </Link>
            <Link href={{ pathname, query: { lang: "am" } }} lang="am">
              {labels.amharic}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
