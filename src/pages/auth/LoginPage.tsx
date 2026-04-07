import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuthContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const role = await login(email, password);
      navigate(role === "admin" ? "/admin" : "/");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <h1 style={styles.logoText}>MarketFlow</h1>
          <p style={styles.logoSub}>South Bend Farmers Market</p>
        </div>

        <h2 style={styles.title}>Welcome back</h2>
        <p style={styles.subtitle}>Sign in to your account</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p style={styles.switchText}>
          Don't have an account?{" "}
          <Link to="/signup" style={styles.link}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
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
    maxWidth: 420,
    boxShadow: "0 4px 24px rgba(26,58,42,0.08)",
  },
  logo: {
    textAlign: "center",
    marginBottom: 32,
  },
  logoText: {
    fontFamily: "Playfair Display, serif",
    fontSize: 28,
    color: "var(--forest)",
    marginBottom: 2,
  },
  logoSub: {
    fontSize: 13,
    color: "var(--text-muted)",
  },
  title: {
    fontFamily: "Playfair Display, serif",
    fontSize: 22,
    color: "var(--forest)",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "var(--text-secondary)",
    marginBottom: 24,
  },
  error: {
    background: "#fff0f0",
    border: "1px solid #ffcdd2",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: "#c62828",
    marginBottom: 20,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--text-primary)",
  },
  input: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid var(--cream-dark)",
    fontSize: 14,
    outline: "none",
    fontFamily: "DM Sans, sans-serif",
    background: "var(--cream)",
    color: "var(--text-primary)",
    transition: "border-color 0.15s",
  },
  submitBtn: {
    background: "var(--forest-mid)",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "12px",
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
    marginTop: 4,
    transition: "background 0.15s",
  },
  switchText: {
    textAlign: "center",
    fontSize: 13,
    color: "var(--text-muted)",
    marginTop: 20,
  },
  link: {
    color: "var(--forest-mid)",
    fontWeight: 500,
  },
};
