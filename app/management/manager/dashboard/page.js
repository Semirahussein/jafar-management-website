"use client";

import Link from "next/link";
import { useManagerData } from "../manager-data";

export default function ManagerDashboardPage() {
  const { branches, teachers, students, error, isLoading } = useManagerData();

  return (
    <div className="manager-page">
      <section className="manager-page-heading">
        <p className="manager-eyebrow">ORGANIZATION OVERVIEW</p>
        <h1>Manager dashboard</h1>
        <p>A simple overview of your branches, teachers, and students.</p>
      </section>

      {error && <p className="manager-empty" role="alert">{error}</p>}
      {isLoading && <p role="status">Loading your branch data…</p>}

      <section className="manager-stat-grid" aria-label="Organization totals">
        <article className="manager-stat-card">
          <span>Branches</span>
          <strong>{isLoading ? "…" : branches.length}</strong>
          <small>Currently listed</small>
        </article>
        <article className="manager-stat-card">
          <span>Students</span>
          <strong>{isLoading ? "…" : students.length}</strong>
          <small>Across all branches</small>
        </article>
        <article className="manager-stat-card">
          <span>Teachers</span>
          <strong>{isLoading ? "…" : teachers.length}</strong>
          <small>Across all branches</small>
        </article>
        <article className="manager-stat-card">
          <span>Branch admins</span>
          <strong>{isLoading ? "…" : branches.length}</strong>
          <small>Branches assigned to you</small>
        </article>
      </section>

      <section className="manager-panel">
        <div className="manager-panel-heading">
          <div>
            <h2>Branches</h2>
            <p>Student and teacher totals for each branch.</p>
          </div>
          <Link className="manager-text-link" href="/management/manager/branches">
            View all branches
          </Link>
        </div>

        {isLoading || error ? null : <div className="manager-table-wrap">
          <table className="manager-table">
            <thead>
              <tr>
                <th scope="col">Branch</th>
                <th scope="col">Branch admin</th>
                <th scope="col">Teachers</th>
                <th scope="col">Students</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id}>
                  <th scope="row">{branch.name}</th>
                  <td>{branch.admin || "Not assigned"}</td>
                  <td>{branch.teacherCount}</td>
                  <td>{branch.studentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </section>
    </div>
  );
}
