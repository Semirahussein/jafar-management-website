"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiRequest } from "@/app/lib/api";
import { useAuth } from "../../auth-provider";
import "../dashboard/dashboard.css";
import "../students/register/register.css";

export default function AdminBranchesPage() {
  const router = useRouter();
  const { credentials, signOut, user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [managers, setManagers] = useState([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [assignmentBranchIds, setAssignmentBranchIds] = useState([]);
  const [newManagerBranchIds, setNewManagerBranchIds] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [managerUsername, setManagerUsername] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refreshData = useCallback(async () => {
    if (!credentials) return;
    const [branchList, users] = await Promise.all([
      apiRequest("/api/branches", { auth: credentials }),
      apiRequest("/api/users", { auth: credentials }),
    ]);
    if (!Array.isArray(branchList) || !Array.isArray(users)) {
      throw new Error("The backend returned an unexpected branches or users response.");
    }
    setBranches(branchList);
    setManagers(
      users.filter((candidate) => candidate.role === "BRANCH_MANAGER")
    );
  }, [credentials]);

  useEffect(() => {
    if (!credentials || !user) {
      router.replace("/management/login");
      return;
    }
    if (user.role !== "ADMINISTRATOR") return;

    let active = true;
    Promise.all([
      apiRequest("/api/branches", { auth: credentials }),
      apiRequest("/api/users", { auth: credentials }),
    ])
      .then(([branchList, users]) => {
        if (!Array.isArray(branchList) || !Array.isArray(users)) {
          throw new Error("The backend returned an unexpected branches or users response.");
        }
        if (!active) return;
        setBranches(branchList);
        setManagers(users.filter((candidate) => candidate.role === "BRANCH_MANAGER"));
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load branches."
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [credentials, router, user]);

  const selectedManager = useMemo(
    () => managers.find((manager) => manager.id === Number(selectedManagerId)),
    [managers, selectedManagerId]
  );

  const accessError =
    user && user.role !== "ADMINISTRATOR"
      ? "Only administrators can create branches and assign branch managers."
      : "";

  const toggleBranch = (setCurrent, branchId) => {
    setCurrent((selected) =>
      selected.includes(branchId)
        ? selected.filter((id) => id !== branchId)
        : [...selected, branchId]
    );
  };

  const handleCreateBranch = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSaving(true);
    try {
      await apiRequest("/api/branches", {
        method: "POST",
        auth: credentials,
        body: { name: branchName.trim(), address: branchAddress.trim() || null },
      });
      setBranchName("");
      setBranchAddress("");
      await refreshData();
      setNotice("Branch created.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create the branch."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateManager = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (newManagerBranchIds.length === 0) {
      setError("Select at least one branch for this manager.");
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest("/api/users", {
        method: "POST",
        auth: credentials,
        body: {
          username: managerUsername.trim(),
          password: managerPassword,
          role: "BRANCH_MANAGER",
          branchIds: newManagerBranchIds,
        },
      });
      setManagerUsername("");
      setManagerPassword("");
      setNewManagerBranchIds([]);
      await refreshData();
      setNotice("Branch manager created and assigned to the selected branches.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create the branch manager."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAssignment = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!selectedManager) {
      setError("Choose a branch manager.");
      return;
    }
    if (assignmentBranchIds.length === 0) {
      setError("A branch manager must be assigned to at least one branch.");
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest(`/api/users/${selectedManager.id}`, {
        method: "PUT",
        auth: credentials,
        body: {
          username: selectedManager.username,
          role: selectedManager.role,
          branchIds: assignmentBranchIds,
          active: selectedManager.active,
        },
      });
      await refreshData();
      setNotice("Branch assignments updated.");
    } catch (requestError) {
      setError(
        requestError instanceof ApiError && requestError.status === 401
          ? "Your sign-in is no longer valid. Sign in again."
          : requestError instanceof Error
            ? requestError.message
            : "Unable to update branch assignments."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/management/admin/dashboard">
          <span className="admin-brand-mark">JM</span>
          <span className="admin-brand-text">
            <strong>Jafar Madrasa</strong>
            <small>Branch management</small>
          </span>
        </Link>
        <div className="admin-sidebar-label">WORKSPACE</div>
        <nav className="admin-navigation" aria-label="Admin navigation">
          <Link href="/management/admin/dashboard" className="admin-nav-link">
            <span className="admin-nav-icon" aria-hidden="true">⌂</span>
            Dashboard
          </Link>
          <Link href="/management/admin/students" className="admin-nav-link">
            <span className="admin-nav-icon" aria-hidden="true">♙</span>
            Students
          </Link>
          <Link href="/management/admin/branches" className="admin-nav-link active">
            <span className="admin-nav-icon" aria-hidden="true">▦</span>
            Branches
          </Link>
          <Link href="/management/admin/teachers" className="admin-nav-link">
            <span className="admin-nav-icon" aria-hidden="true">♧</span>
            Teachers
          </Link>
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-branch-avatar">AD</div>
          <div>
            <strong>{user?.username || "Administrator"}</strong>
            <span>Administrator</span>
          </div>
        </div>
        <Link className="admin-logout-link" href="/management/login" onClick={signOut}>
          <span className="admin-nav-icon" aria-hidden="true">↪</span>
          Logout
        </Link>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-mobile-brand">
            <span className="admin-brand-mark">JM</span>
            <strong>Jafar Madrasa</strong>
          </div>
          <div className="admin-user">
            <div className="admin-user-avatar">AD</div>
            <div className="admin-user-details">
              <strong>{user?.username || "Administrator"}</strong>
              <span>Administrator</span>
            </div>
          </div>
        </header>

        <div className="admin-content register-student-content">
          <section className="admin-welcome">
            <div>
              <p className="admin-eyebrow">ORGANIZATION SETUP</p>
              <h1>Branches and managers</h1>
              <p>Create the two branch records, then assign one manager account to both.</p>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>Branches</h2>
                <p>{branches.length} branch{branches.length === 1 ? "" : "es"} in the system</p>
              </div>
            </div>
            {accessError ? (
              <p className="register-student-error" role="alert">{accessError}</p>
            ) : isLoading ? (
              <p role="status">Loading branches…</p>
            ) : (
              <>
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr><th>Name</th><th>Address</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {branches.map((branch) => (
                        <tr key={branch.id}>
                          <td>{branch.name}</td>
                          <td>{branch.address || "—"}</td>
                          <td>{branch.active ? "Active" : "Inactive"}</td>
                        </tr>
                      ))}
                      {branches.length === 0 && (
                        <tr><td colSpan="3">Create the first branch below.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <form className="register-student-form branch-setup-form" onSubmit={handleCreateBranch}>
                  <label>
                    Branch name
                    <input
                      value={branchName}
                      maxLength={120}
                      onChange={(event) => setBranchName(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Address (optional)
                    <input
                      value={branchAddress}
                      maxLength={255}
                      onChange={(event) => setBranchAddress(event.target.value)}
                    />
                  </label>
                  <div className="register-student-actions">
                    <button type="submit" disabled={isSaving}>
                      {isSaving ? "Saving…" : "Create branch"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>

          <section className="admin-panel branch-manager-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>Create a manager for selected branches</h2>
                <p>The password must be at least 12 characters.</p>
              </div>
            </div>
            <form className="register-student-form" onSubmit={handleCreateManager}>
              <label>
                Manager username
                <input
                  autoComplete="username"
                  maxLength={80}
                  value={managerUsername}
                  onChange={(event) => setManagerUsername(event.target.value)}
                  required
                />
              </label>
              <label>
                Temporary password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={100}
                  value={managerPassword}
                  onChange={(event) => setManagerPassword(event.target.value)}
                  required
                />
              </label>
              <fieldset className="branch-checkboxes">
                <legend>Branches this manager can access</legend>
                {branches.map((branch) => (
                  <label key={branch.id}>
                    <input
                      type="checkbox"
                      checked={newManagerBranchIds.includes(branch.id)}
                      onChange={() =>
                        toggleBranch(setNewManagerBranchIds, branch.id)
                      }
                    />
                    {branch.name}
                  </label>
                ))}
              </fieldset>
              <div className="register-student-actions">
                <button type="submit" disabled={isSaving || branches.length === 0}>
                  {isSaving ? "Saving…" : "Create manager"}
                </button>
              </div>
            </form>
          </section>

          <section className="admin-panel branch-manager-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>Update manager branch access</h2>
                <p>One manager can be assigned to both branches.</p>
              </div>
            </div>
            {managers.length === 0 ? (
              <p>Create a branch manager above to manage branch access.</p>
            ) : (
              <form className="register-student-form" onSubmit={handleSaveAssignment}>
                <label>
                  Branch manager
                  <select
                    value={selectedManagerId}
                    onChange={(event) => {
                      const managerId = event.target.value;
                      setSelectedManagerId(managerId);
                      const manager = managers.find(
                        (candidate) => candidate.id === Number(managerId)
                      );
                      setAssignmentBranchIds(manager?.branchIds || []);
                    }}
                    required
                  >
                    <option value="" disabled>Select a manager</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.username}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedManager && (
                  <fieldset className="branch-checkboxes">
                    <legend>Branches this manager can access</legend>
                    {branches.map((branch) => (
                      <label key={branch.id}>
                        <input
                          type="checkbox"
                          checked={assignmentBranchIds.includes(branch.id)}
                          onChange={() =>
                            toggleBranch(setAssignmentBranchIds, branch.id)
                          }
                        />
                        {branch.name}
                      </label>
                    ))}
                  </fieldset>
                )}
                <div className="register-student-actions">
                  <button type="submit" disabled={isSaving || !selectedManager}>
                    {isSaving ? "Saving…" : "Save manager access"}
                  </button>
                </div>
              </form>
            )}
          </section>

          {(error || accessError) && (
            <p className="register-student-error" role="alert">{accessError || error}</p>
          )}
          {notice && <p className="branch-setup-notice" role="status">{notice}</p>}
        </div>
      </main>
    </div>
  );
}
