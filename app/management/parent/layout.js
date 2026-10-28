"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "./layout.css";

const navItems = [
  { href: "/management/parent/dashboard", label: "Dashboard", icon: "⌂" },
  { href: "/management/parent/child", label: "My Child", icon: "♙" },
  { href: "/management/parent/announcements", label: "Announcements", icon: "◌" },
  { href: "/management/parent/messages", label: "Messages", icon: "✉" },
  { href: "/management/parent/settings", label: "Settings", icon: "⚙" },
];

export default function ParentLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="parent-shell">
      <aside className="parent-sidebar">
        <Link className="parent-brand" href="/management/parent/dashboard">
          <span className="parent-brand-mark">JM</span>
          <span className="parent-brand-text">
            <strong>Jafar Madrasa</strong>
            <small>Parent portal</small>
          </span>
        </Link>

        <div className="parent-sidebar-label">PORTAL</div>
        <nav className="parent-navigation" aria-label="Parent navigation">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`parent-nav-link ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="parent-nav-icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="parent-user-box">
          <div className="parent-user-avatar">SR</div>
          <div>
            <strong>Samira Rahman</strong>
            <span>Parent account</span>
          </div>
        </div>

        <Link className="parent-logout-link" href="/management/login">
          <span className="parent-nav-icon" aria-hidden="true">↪</span>
          Logout
        </Link>
      </aside>

      <main className="parent-main">
        <header className="parent-topbar">
          <div className="parent-mobile-brand">
            <span className="parent-brand-mark">JM</span>
            <strong>Jafar Madrasa</strong>
          </div>
          <div className="parent-topbar-date">
            {new Intl.DateTimeFormat("en", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            }).format(new Date())}
          </div>
          <div className="parent-user-mini">
            <div className="parent-user-avatar small">SR</div>
            <div className="parent-user-details">
              <strong>Samira Rahman</strong>
              <span>Parent</span>
            </div>
          </div>
        </header>

        <div className="parent-page-shell">{children}</div>
      </main>
    </div>
  );
}
