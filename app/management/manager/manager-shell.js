"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/management/manager/dashboard", label: "Dashboard", icon: "⌂" },
  { href: "/management/manager/branches", label: "Branches", icon: "▦" },
  { href: "/management/manager/teachers", label: "Teachers", icon: "♧" },
  { href: "/management/manager/branch-admins", label: "Branch Admins", icon: "♙" },
  { href: "/management/manager/students", label: "Students", icon: "♙" },
];

export default function ManagerShell({ children }) {
  const pathname = usePathname();

  return (
    <div className="manager-layout">
      <aside className="manager-sidebar">
        <Link className="manager-brand" href="/management/manager/dashboard">
          <span className="manager-brand-mark">JM</span>
          <span>
            <strong>Jafar Madrasa</strong>
            <small>Management</small>
          </span>
        </Link>

        <div className="manager-sidebar-label">OVERVIEW</div>
        <nav className="manager-navigation" aria-label="Manager navigation">
          {navigation.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`manager-nav-link${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="manager-nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="manager-sidebar-footer">
          <span className="manager-avatar" aria-hidden="true">M</span>
          <span>
            <strong>Manager</strong>
            <small>All branches</small>
          </span>
        </div>
        <Link className="manager-logout" href="/management/login">
          <span className="manager-nav-icon" aria-hidden="true">↪</span>
          Logout
        </Link>
      </aside>

      <main className="manager-main">
        <header className="manager-topbar">
          <span className="manager-topbar-brand">Jafar Madrasa</span>
          <span className="manager-topbar-role">Manager overview</span>
        </header>
        <div className="manager-content">{children}</div>
      </main>
    </div>
  );
}
