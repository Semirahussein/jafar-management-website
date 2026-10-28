"use client";

import Link from "next/link";
import { useManagerData } from "../manager-data";

export default function ManagerBranchesPage() {
  const { branches } = useManagerData();

  return (
    <div className="manager-page">
      <section className="manager-page-heading">
        <p className="manager-eyebrow">BRANCH DIRECTORY</p>
        <h1>Branches</h1>
        <p>See the admin, teacher, and student totals for each branch.</p>
      </section>

      <section className="manager-panel">
        <div className="manager-panel-heading">
          <div>
            <h2>All branches</h2>
            <p>{branches.length} branch{branches.length === 1 ? "" : "es"} listed</p>
          </div>
        </div>
        <div className="manager-table-wrap">
          <table className="manager-table">
            <thead>
              <tr>
                <th scope="col">Branch</th>
                <th scope="col">Branch admin</th>
                <th scope="col">Teachers</th>
                <th scope="col">Students</th>
                <th scope="col">View</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id}>
                  <th scope="row">
                    <span className="manager-row-title">{branch.name}</span>
                    <small>{branch.location}</small>
                  </th>
                  <td>{branch.admin || "Not assigned"}</td>
                  <td>{branch.teacherCount}</td>
                  <td>{branch.studentCount}</td>
                  <td className="manager-row-links">
                    <Link href="/management/manager/teachers">Teachers</Link>
                    <Link href="/management/manager/students">Students</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
