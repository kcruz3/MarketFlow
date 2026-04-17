import React, { useEffect, useState } from "react";
import { useAuthContext } from "../../context/AuthContext";
import { IconSave } from "../../components/Icons";

function getProfileHeading(displayName: string, email?: string) {
  const trimmed = displayName.trim();
  if (!trimmed) return "Your Profile";
  if (email && trimmed.toLowerCase() === email.toLowerCase()) {
    const localPart = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
    if (localPart) {
      return localPart.replace(/\b\w/g, (char) => char.toUpperCase());
    }
    return "Your Profile";
  }
  return trimmed;
}

export default function ProfilePage() {
  const { user, updateProfile } = useAuthContext();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || user.username || "");
    setPhone(user.phone || "");
    setBio(user.bio || "");
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Display name is required");
      return;
    }

    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await updateProfile({ displayName, phone, bio });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">My Account</div>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <IconSave size={15} />
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>

      <div className="page-content">
        <div className="page-header" style={{ marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--text-muted)", fontWeight: 700, marginBottom: 10 }}>
              Account settings
            </div>
            <h2>{getProfileHeading(displayName || user?.displayName || user?.username || "", user?.email)}</h2>
            <p>Update the details people see across reviews, orders, and your account.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <span className="badge badge-gray" style={{ textTransform: "capitalize" }}>
              {user?.role}
            </span>
            <span className="badge badge-gray">{user?.email}</span>
          </div>
        </div>

        {saved && (
          <div
            style={{
              background: "var(--sage-pale)",
              border: "1px solid var(--sage-light)",
              borderRadius: 10,
              padding: "12px 18px",
              fontSize: 13.5,
              color: "var(--forest-mid)",
              marginBottom: 20,
              fontWeight: 600,
            }}
          >
            Profile saved successfully
          </div>
        )}

        {error && (
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
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
              alignItems: "start",
            }}
          >
            <div className="card">
              <div className="card-header">
                <h3>Personal details</h3>
              </div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Display name</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How your name should appear"
                    style={inputStyle}
                  />
                  <span style={hintStyle}>
                    This is the name people will see on reviews and account screens.
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Email</label>
                    <input value={user?.email || ""} disabled style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }} />
                    <span style={hintStyle}>Email stays the same for sign-in</span>
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Phone</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Optional contact number"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>About you</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={5}
                    placeholder="Add a short bio, pickup preference, or anything helpful"
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3>Account summary</h3>
              </div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={summaryLabelStyle}>Role</div>
                  <span className="badge badge-gray" style={{ textTransform: "capitalize" }}>
                    {user?.role}
                  </span>
                </div>
                <div>
                  <div style={summaryLabelStyle}>Username</div>
                  <div style={summaryValueStyle}>{user?.username}</div>
                </div>
                <div>
                  <div style={summaryLabelStyle}>Email</div>
                  <div style={summaryValueStyle}>{user?.email}</div>
                </div>
                {user?.role === "vendor" && (
                  <div>
                    <div style={summaryLabelStyle}>Vendor link</div>
                    <div style={summaryValueStyle}>{user?.vendorSlug || "Not linked"}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-primary)",
};

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-muted)",
};

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(221, 207, 187, 0.95)",
  fontSize: 14,
  outline: "none",
  fontFamily: "DM Sans, sans-serif",
  background: "rgba(248, 244, 236, 0.82)",
  color: "var(--text-primary)",
  boxShadow: "var(--shadow-sm)",
};

const summaryLabelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  marginBottom: 4,
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: 14,
  color: "var(--text-primary)",
  fontWeight: 500,
  wordBreak: "break-word",
};
