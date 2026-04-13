import React, { useState } from "react";
import {
  useVendorApplications,
  VendorApplication,
} from "../../hooks/useVendorApplications";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "badge-amber",
    approved: "badge-green",
    rejected: "badge-gray",
  };
  return (
    <span className={`badge ${map[status] || "badge-gray"}`}>{status}</span>
  );
}

export default function AdminApprovalsPage() {
  const { applications, loading, error, approve, reject } = useVendorApplications();
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");
  const [actionId, setActionId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState("");

  const filtered = applications.filter(
    (a) => filter === "all" || a.status === filter
  );

  const handleApprove = async (app: VendorApplication) => {
    setProcessing(true);
    setActionError("");
    try {
      await approve(app.objectId, app.userId, app.businessName, notes);
      setActionId(null);
      setNotes("");
    } catch (e: any) {
      setActionError(e.message || "Failed to approve application");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (appId: string) => {
    setProcessing(true);
    setActionError("");
    try {
      await reject(appId, notes);
      setActionId(null);
      setNotes("");
    } catch (e: any) {
      setActionError(e.message || "Failed to reject application");
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = applications.filter(
    (a) => a.status === "pending"
  ).length;

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Vendor Applications</div>
        {pendingCount > 0 && (
          <span className="badge badge-amber">
            {pendingCount} pending review
          </span>
        )}
      </div>

      <div className="page-content">
        <div className="page-header">
          <h2>Vendor Applications</h2>
          <p>Review and approve vendors applying to join the market</p>
        </div>

        {error && (
          <div className="empty-state" style={{ marginBottom: 20 }}>
            <h3>Could not load applications</h3>
            <p>{error}</p>
          </div>
        )}

        {actionError && (
          <div
            style={{
              background: "#fff0f0",
              border: "1px solid #ffcdd2",
              borderRadius: 10,
              padding: "12px 18px",
              fontSize: 13.5,
              color: "#c62828",
              marginBottom: 20,
            }}
          >
            {actionError}
          </div>
        )}

        {/* Filter tabs */}
        <div className="filter-bar" style={{ marginBottom: 20 }}>
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              className={`filter-chip ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
              style={{ textTransform: "capitalize" }}
            >
              {f}{" "}
              {f !== "all" &&
                `(${applications.filter((a) => a.status === f).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-spinner">Loading applications...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"></div>
            <h3>No {filter === "all" ? "" : filter} applications</h3>
            <p>Applications will appear here when vendors sign up</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {filtered.map((app) => (
              <div className="card" key={app.objectId}>
                <div className="card-body" style={{ padding: "20px 24px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 6,
                        }}
                      >
                        <h3
                          style={{
                            fontFamily: "Playfair Display, serif",
                            fontSize: 18,
                            color: "var(--green-deep)",
                          }}
                        >
                          {app.businessName}
                        </h3>
                        <StatusBadge status={app.status} />
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--text-muted)",
                          marginBottom: 10,
                        }}
                      >
                        {app.userEmail} · Applied{" "}
                        {new Date(app.createdAt).toLocaleDateString()}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          marginBottom: 10,
                        }}
                      >
                        <span className="badge badge-gray">{app.category}</span>
                        {app.location && (
                          <span
                            style={{ fontSize: 13, color: "var(--text-muted)" }}
                          >
                            {app.location}
                          </span>
                        )}
                        {app.website && (
                          <a
                            href={app.website}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 13, color: "var(--green-mid)" }}
                          >
                            {app.website}
                          </a>
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: 14,
                          color: "var(--text-secondary)",
                          lineHeight: 1.6,
                        }}
                      >
                        {app.description}
                      </p>
                      {app.adminNotes && (
                        <div
                          style={{
                            marginTop: 10,
                            padding: "8px 12px",
                            background: "var(--cream)",
                            borderRadius: 6,
                            fontSize: 13,
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          Note: {app.adminNotes}
                        </div>
                      )}
                    </div>

                    {app.status === "pending" && (
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        {actionId === app.objectId ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 8,
                              minWidth: 220,
                            }}
                          >
                            <textarea
                              placeholder="Admin notes (optional)..."
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              rows={2}
                              style={{
                                padding: "8px 12px",
                                borderRadius: 8,
                                border: "1px solid var(--cream-dark)",
                                fontSize: 13,
                                fontFamily: "DM Sans, sans-serif",
                                resize: "none",
                                outline: "none",
                              }}
                            />
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                onClick={() => handleApprove(app)}
                                disabled={processing}
                                style={{
                                  flex: 1,
                                  padding: "7px",
                                  borderRadius: 6,
                                  border: "none",
                                  background: "var(--green-mid)",
                                  color: "white",
                                  fontSize: 13,
                                  cursor: "pointer",
                                  fontFamily: "DM Sans, sans-serif",
                                }}
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() => handleReject(app.objectId)}
                                disabled={processing}
                                style={{
                                  flex: 1,
                                  padding: "7px",
                                  borderRadius: 6,
                                  border: "1px solid var(--cream-dark)",
                                  background: "white",
                                  color: "var(--text-secondary)",
                                  fontSize: 13,
                                  cursor: "pointer",
                                  fontFamily: "DM Sans, sans-serif",
                                }}
                              >
                                ✕ Reject
                              </button>
                              <button
                                onClick={() => {
                                  setActionId(null);
                                  setNotes("");
                                }}
                                style={{
                                  padding: "7px 10px",
                                  borderRadius: 6,
                                  border: "1px solid var(--cream-dark)",
                                  background: "white",
                                  color: "var(--text-muted)",
                                  fontSize: 13,
                                  cursor: "pointer",
                                  fontFamily: "DM Sans, sans-serif",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActionId(app.objectId)}
                            className="btn btn-primary"
                            style={{ fontSize: 13, padding: "7px 16px" }}
                          >
                            Review
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
