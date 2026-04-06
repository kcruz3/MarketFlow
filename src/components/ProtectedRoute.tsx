import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { UserRole } from "../hooks/useAuth";

interface Props {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 4,
  admin: 3,
  vendor: 2,
  customer: 1,
};

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, loading } = useAuthContext();

  if (loading)
    return (
      <div className="loading-spinner" style={{ minHeight: "100vh" }}>
        Loading...
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole) {
    const userLevel = ROLE_HIERARCHY[user.role ?? "customer"] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
    // Owner can access everything. Others need exact role match.
    if (user.role !== "owner" && userLevel < requiredLevel) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
