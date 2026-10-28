"use client";

import { useManagerData } from "../manager-data";

export default function ManagerBranchAdminsPage() {
  const { branches } = useManagerData();
  const assignedBranches = branches.filter((branch) => branch.admin);

  return (
    <div className="manager-page">
      <section className="manager-page-heading">
        <p className="manager-eyebrow">ADMIN DIRECTORY</p>
        <h1>Branch admins</h1>
        <p>See which admin is responsible for each branch.</p>
      </section>

      <section className="manager-panel">
        <div className="manager-panel-heading">
          <div>
            <h2>Assigned branch admins</h2>
            <p>{assignedBranches.length} admin assignment{assignedBranches.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <div className="manager-table-wrap">
          <table className="manager-table">
            <thead>
              <tr>
                <th scope="col">Admin</th>
                <th scope="col">Branch</th>
                <th scope="col">Responsibility</th>
              </tr>
            </thead>
            <tbody>
              {assignedBranches.map((branch) => (
                <tr key={branch.id}>
                  <th scope="row">{branch.admin}</th>
                  <td>{branch.name}</td>
                  <td>Branch administrator</td>
                </tr>
              ))}
              {assignedBranches.length === 0 && (
                <tr>
                  <td className="manager-empty" colSpan="3">
                    No branch admins have been assigned yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="manager-note">
        Admin assignment can be managed when branch admin accounts are available in the system.
      </p>
    </div>
  );
}
