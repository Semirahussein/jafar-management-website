"use client";

import { useState } from "react";
import { useManagerData } from "../manager-data";

export default function ManagerStudentsPage() {
  const { students } = useManagerData();
  const [search, setSearch] = useState("");
  const filteredStudents = students.filter((student) =>
    `${student.name} ${student.teacher}`.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="manager-page">
      <section className="manager-page-heading">
        <p className="manager-eyebrow">STUDENT DIRECTORY</p>
        <h1>Students</h1>
        <p>Find a student and see their branch and assigned teacher.</p>
      </section>

      <section className="manager-panel">
        <div className="manager-panel-heading manager-list-heading">
          <div>
            <h2>All students</h2>
            <p>{filteredStudents.length} student{filteredStudents.length === 1 ? "" : "s"}</p>
          </div>
          <label className="manager-search">
            <span>Search students</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Enter a name or teacher"
            />
          </label>
        </div>
        <div className="manager-table-wrap">
          <table className="manager-table">
            <thead>
              <tr>
                <th scope="col">Student</th>
                <th scope="col">Branch</th>
                <th scope="col">Teacher</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <th scope="row">{student.name}</th>
                  <td>Main Branch</td>
                  <td>{student.teacher}</td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td className="manager-empty" colSpan="3">
                    No students match that search.
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
