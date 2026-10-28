"use client";

import { useState } from "react";
import { useManagerData } from "../manager-data";

export default function ManagerTeachersPage() {
  const { teachers } = useManagerData();
  const [search, setSearch] = useState("");
  const filteredTeachers = teachers.filter((teacher) =>
    `${teacher.name} ${teacher.subject}`.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="manager-page">
      <section className="manager-page-heading">
        <p className="manager-eyebrow">STAFF DIRECTORY</p>
        <h1>Teachers</h1>
        <p>Find teachers and see their branch and assigned student totals.</p>
      </section>

      <section className="manager-panel">
        <div className="manager-panel-heading manager-list-heading">
          <div>
            <h2>All teachers</h2>
            <p>{filteredTeachers.length} teacher{filteredTeachers.length === 1 ? "" : "s"}</p>
          </div>
          <label className="manager-search">
            <span>Search teachers</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Enter a name or subject"
            />
          </label>
        </div>
        <div className="manager-table-wrap">
          <table className="manager-table">
            <thead>
              <tr>
                <th scope="col">Teacher</th>
                <th scope="col">Branch</th>
                <th scope="col">Subject</th>
                <th scope="col">Students</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map((teacher) => (
                <tr key={teacher.id}>
                  <th scope="row">{teacher.name}</th>
                  <td>Main Branch</td>
                  <td>{teacher.subject}</td>
                  <td>{teacher.assignedStudents.length}</td>
                </tr>
              ))}
              {filteredTeachers.length === 0 && (
                <tr>
                  <td className="manager-empty" colSpan="4">
                    No teachers match that search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
