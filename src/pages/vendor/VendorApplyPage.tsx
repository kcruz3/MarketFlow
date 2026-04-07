import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import { submitApplication } from "../../hooks/useVendorApplications";
import { IconLeaf } from "../../components/Icons";

const CATEGORIES = [
  "Farmers, Fishers, Foragers",
  "Food & Beverage Producers",
  "Prepared Food",
  "Artisan & Crafts",
  "Other",
];

export default function VendorApplyPage() {
  const { user, signup } = useAuthContext();
  const navigate = useNavigate();

  // Auth fields (only if not logged in)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Application fields
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");

  const [step, setStep] = useState<"account" | "application">(
    user ? "application" : "account"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleAccountNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signup(email, password);
      setStep("application");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !category || !description) {
      setError("Please fill in all required fields");
      return;
    }
    const currentUser = user;
    if (!currentUser) {
      setError("You must be logged in");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await submitApplication({
        userId: currentUser.objectId,
        userEmail: currentUser.email,
        businessName,
        category,
        description,
        location,
        website,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ marginBottom: 16 }}>
              <IconLeaf size={56} color="var(--green-mid)" />
            </div>
            <h2 style={s.title}>Application submitted!</h2>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                marginBottom: 24,
                lineHeight: 1.6,
              }}
            >
              Thank you for applying to South Bend Farmers Market. Our team will
              review your application and get back to you within 2–3 business
              days.
            </p>
            <button className="btn btn-primary" onClick={() => navigate("/")}>
              Back to Market
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <h1 style={s.logoText}>MarketFlow</h1>
          <p style={s.logoSub}>Vendor Application</p>
        </div>

        {/* Step indicator */}
        {!user && (
          <div style={s.steps}>
            {["Create account", "Your business"].map((label, i) => {
              const current = step === "account" ? 0 : 1;
              return (
                <div
                  key={label}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background:
                        i <= current ? "var(--green-mid)" : "var(--cream-dark)",
                      color: i <= current ? "white" : "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {i < current ? "✓" : i + 1}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      color:
                        i === current
                          ? "var(--green-deep)"
                          : "var(--text-muted)",
                      fontWeight: i === current ? 500 : 400,
                    }}
                  >
                    {label}
                  </span>
                  {i < 1 && (
                    <span
                      style={{ color: "var(--cream-dark)", margin: "0 8px" }}
                    >
                      ›
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {error && <div style={s.error}>{error}</div>}

        {/* Step 1: Account */}
        {step === "account" && (
          <form onSubmit={handleAccountNext} style={s.form}>
            <h2 style={s.title}>Create your account</h2>
            <p style={s.subtitle}>
              You'll use this to manage your vendor profile and orders
            </p>
            <div style={s.field}>
              <label style={s.label}>Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={s.input}
                required
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                style={s.input}
                required
              />
            </div>
            <button type="submit" style={s.submitBtn} disabled={loading}>
              {loading ? "Creating account..." : "Continue →"}
            </button>
            <p style={s.switchText}>
              Already have an account?{" "}
              <Link to="/login" style={s.link}>
                Sign in
              </Link>
            </p>
          </form>
        )}

        {/* Step 2: Application */}
        {step === "application" && (
          <form onSubmit={handleSubmitApplication} style={s.form}>
            <h2 style={s.title}>Tell us about your business</h2>
            <p style={s.subtitle}>
              Our team reviews all applications before approving access
            </p>

            <div style={s.field}>
              <label style={s.label}>Business name *</label>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Sunrise Berry Farm"
                style={s.input}
                required
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={s.input}
                required
              >
                <option value="">Select a category...</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>What do you sell? *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your products and what makes them special..."
                rows={4}
                style={{ ...s.input, resize: "vertical" }}
                required
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>
                Location / farm address <span style={s.opt}>(optional)</span>
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Skagit Valley, WA"
                style={s.input}
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>
                Website or social <span style={s.opt}>(optional)</span>
              </label>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                style={s.input}
              />
            </div>
            <button type="submit" style={s.submitBtn} disabled={loading}>
              {loading ? "Submitting..." : "✓ Submit Application"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "var(--cream)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    background: "var(--white)",
    borderRadius: 16,
    border: "1px solid var(--cream-dark)",
    padding: "40px 40px 32px",
    width: "100%",
    maxWidth: 480,
    boxShadow: "0 4px 24px rgba(26,58,42,0.08)",
  },
  logo: { textAlign: "center", marginBottom: 24 },
  logoText: {
    fontFamily: "Playfair Display, serif",
    fontSize: 26,
    color: "var(--green-deep)",
    marginBottom: 2,
  },
  logoSub: { fontSize: 13, color: "var(--text-muted)" },
  steps: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 28,
  },
  title: {
    fontFamily: "Playfair Display, serif",
    fontSize: 20,
    color: "var(--green-deep)",
    marginBottom: 4,
  },
  subtitle: { fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 },
  error: {
    background: "#fff0f0",
    border: "1px solid #ffcdd2",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: "#c62828",
    marginBottom: 16,
  },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: "var(--text-primary)" },
  opt: { fontWeight: 400, color: "var(--text-muted)", fontSize: 12 },
  input: {
    padding: "9px 14px",
    borderRadius: 8,
    border: "1px solid var(--cream-dark)",
    fontSize: 14,
    outline: "none",
    fontFamily: "DM Sans, sans-serif",
    background: "var(--cream)",
    color: "var(--text-primary)",
  },
  submitBtn: {
    background: "var(--green-mid)",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "12px",
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
    marginTop: 4,
  },
  switchText: {
    textAlign: "center",
    fontSize: 13,
    color: "var(--text-muted)",
    marginTop: 4,
  },
  link: { color: "var(--green-mid)", fontWeight: 500 },
};
