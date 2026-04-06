import React, { useState } from "react";
import { useUsers, ManagedUser } from "../../hooks/useUsers";
import { useAuthContext } from "../../context/AuthContext";
import { UserRole } from "../../hooks/useAuth";
import { IconRefresh } from "../../components/Icons";

const ROLES: UserRole[] = ["owner", "admin", "vendor", "customer"];

const ROLE_STYLES: Record<UserRole, { bg: string; color: string }> = {
  owner: { bg: "rgba(139,92,246,0.15)", color: "#a78bfa" },
  admin: { bg: "rgba(240,168,48,0.15)", color: "#f0a830" },
  vendor: { bg: "rgba(74,140,92,0.15)", color: "#4a8c5c" },
  customer: { bg: "var(--cream-dark)", color: "var(--text-secondary)" },
};

function RoleBadge({ role }: { role: UserRole }) {
  const style = ROLE_STYLES[role];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 500,
        background: style.bg,
        color: style.color,
        textTransform: "capitalize",
      }}
    >
      {role}
    </span>
  );
}

export default function OwnerUsersPage() {
  const { user: currentUser } = useAuthContext();
  const { users, loading, error, changeRole, refetch } = useUsers();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "all">("all");
  const [changing, setChanging] = useState<string | null>(null);
  const [confirmChange, setConfirmChange] = useState<{
    userId: string;
    userEmail: string;
    currentRole: UserRole;
    newRole: UserRole;
  } | null>(null);

  const filtered = users.filter((u) => {
    const matchSearch = u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const roleCounts = ROLES.reduce((acc, r) => {
    acc[r] = users.filter((u) => u.role === r).length;
    return acc;
  }, {} as Record<UserRole, number>);

  const handleRoleSelect = (user: ManagedUser, newRole: UserRole) => {
    if (newRole === user.role) return;
    if (user.objectId === currentUser?.objectId && newRole !== "owner") {
      if (
        !window.confirm(
          "You're about to change your own role. You may lose owner access. Continue?"
        )
      )
        return;
    }
    setConfirmChange({
      userId: user.objectId,
      userEmail: user.email,
      currentRole: user.role,
      newRole,
    });
  };

  const handleConfirm = async () => {
    if (!confirmChange) return;
    setChanging(confirmChange.userId);
    setConfirmChange(null);
    try {
      await changeRole(confirmChange.userId, confirmChange.newRole);
    } catch (e: any) {
      alert("Failed to change role: " + e.message);
    } finally {
      setChanging(null);
    }
  };

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">User Management</div>
        <button
          className="btn btn-secondary"
          onClick={refetch}
          style={{ fontSize: 13 }}
        >
          Refresh
        </button>
      </div>

      <div className="page-content">
        <div className="page-header">
          <h2>All Users</h2>
          <p>Assign roles across Customer, Vendor, Admin, and Owner</p>
        </div>

        {/* Role stat cards */}
        <div
          className="stats-grid"
          style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}
        >
          {ROLES.map((role) => (
            <div
              key={role}
              className="stat-card"
              onClick={() => setFilterRole(filterRole === role ? "all" : role)}
              style={{
                cursor: "pointer",
                borderColor: filterRole === role ? "var(--green-mid)" : "",
                transition: "border-color 0.15s",
              }}
            >
              <div
                className="stat-label"
                style={{ textTransform: "capitalize" }}
              >
                {role}s
              </div>
              <div
                className="stat-value"
                style={{ color: ROLE_STYLES[role].color }}
              >
                {loading ? "—" : roleCounts[role] ?? 0}
              </div>
            </div>
          ))}
        </div>

        {/* Search + filter bar */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 20,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              minWidth: 200,
              padding: "9px 16px",
              borderRadius: 24,
              border: "1px solid var(--cream-dark)",
              fontSize: 14,
              outline: "none",
              fontFamily: "DM Sans, sans-serif",
              background: "var(--white)",
            }}
          />
          <div className="filter-bar" style={{ margin: 0 }}>
            <button
              className={`filter-chip ${filterRole === "all" ? "active" : ""}`}
              onClick={() => setFilterRole("all")}
            >
              All ({users.length})
            </button>
            {ROLES.map((r) => (
              <button
                key={r}
                className={`filter-chip ${filterRole === r ? "active" : ""}`}
                onClick={() => setFilterRole(filterRole === r ? "all" : r)}
                style={{ textTransform: "capitalize" }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner">Loading users...</div>
        ) : error ? (
          <div className="empty-state">
            <h3>Could not load users</h3>
            <p>{error}</p>
          </div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Current Role</th>
                    <th>Joined</th>
                    <th>Change Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr
                      key={u.objectId}
                      style={{
                        opacity: changing === u.objectId ? 0.4 : 1,
                        transition: "opacity 0.2s",
                      }}
                    >
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>
                          {u.email}
                        </div>
                        {u.objectId === currentUser?.objectId && (
                          <div
                            style={{ fontSize: 11, color: "var(--text-muted)" }}
                          >
                            You
                          </div>
                        )}
                      </td>
                      <td>
                        <RoleBadge role={u.role} />
                      </td>
                      <td style={{ fontSize: 13, color: "var(--text-muted)" }}>
                        {new Date(u.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td>
                        {changing === u.objectId ? (
                          <span
                            style={{ fontSize: 13, color: "var(--text-muted)" }}
                          >
                            Updating...
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) =>
                              handleRoleSelect(u, e.target.value as UserRole)
                            }
                            style={{
                              padding: "6px 10px",
                              borderRadius: 8,
                              border: "1px solid var(--cream-dark)",
                              fontSize: 13,
                              outline: "none",
                              fontFamily: "DM Sans, sans-serif",
                              background: "var(--cream)",
                              color: "var(--text-primary)",
                              cursor: "pointer",
                            }}
                          >
                            {ROLES.map((r) => (
                              <option
                                key={r}
                                value={r}
                                style={{ textTransform: "capitalize" }}
                              >
                                {r.charAt(0).toUpperCase() + r.slice(1)}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          textAlign: "center",
                          padding: 32,
                          color: "var(--text-muted)",
                        }}
                      >
                        No users match your search
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Confirm dialog */}
        {confirmChange && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 20,
            }}
          >
            <div
              style={{
                background: "var(--white)",
                borderRadius: 16,
                padding: 32,
                maxWidth: 400,
                width: "100%",
                boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              }}
            >
              <h3
                style={{
                  fontFamily: "Playfair Display, serif",
                  fontSize: 20,
                  color: "var(--green-deep)",
                  marginBottom: 12,
                }}
              >
                Confirm role change
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  marginBottom: 20,
                }}
              >
                Change <strong>{confirmChange.userEmail}</strong> from{" "}
                <RoleBadge role={confirmChange.currentRole} /> to{" "}
                <RoleBadge role={confirmChange.newRole} />?
              </p>
              <div
                style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
              >
                <button
                  onClick={() => setConfirmChange(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button onClick={handleConfirm} className="btn btn-primary">
                  Yes, change role
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
