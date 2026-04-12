import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import {
  IconMap,
  IconLeaf,
  IconChart,
  IconStore,
  IconCalendar,
  IconClipboard,
  IconUsers,
  IconPackage,
  IconKey,
  IconLogOut,
  IconSprout,
  IconShoppingCart,
  IconStar,
} from "./Icons";

const consumerLinks = [
  { label: "Market Map", icon: <IconMap size={16} />, path: "/" },
  { label: "All Vendors", icon: <IconLeaf size={16} />, path: "/vendors" },
  { label: "My Orders", icon: <IconShoppingCart size={16} />, path: "/orders" },
];

const vendorLinks = [
  {
    label: "My Dashboard",
    icon: <IconPackage size={16} />,
    path: "/vendor/dashboard",
  },
  {
    label: "My Profile",
    icon: <IconStore size={16} />,
    path: "/vendor/profile",
  },
];

const adminLinks = [
  { label: "Dashboard", icon: <IconChart size={16} />, path: "/admin" },
  { label: "Vendors", icon: <IconStore size={16} />, path: "/admin/vendors" },
  { label: "Events", icon: <IconCalendar size={16} />, path: "/admin/events" },
  {
    label: "Applications",
    icon: <IconClipboard size={16} />,
    path: "/admin/applications",
  },
  {
    label: "Analytics",
    icon: <IconChart size={16} />,
    path: "/admin/analytics",
  },
  {
    label: "Reviews",
    icon: <IconStar size={16} />,
    path: "/admin/reviews",
  },
];

const ownerLinks = [
  {
    label: "User Management",
    icon: <IconUsers size={16} />,
    path: "/owner/users",
  },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthContext();
  const [open, setOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const isOwner = user?.role === "owner";
  const isAdmin = user?.role === "admin" || isOwner;
  const isVendor = user?.role === "vendor";

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };
  const goTo = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const SidebarContent = () => (
    <>
      <div className="sidebar-logo">
        <h1>MarketFlow</h1>
        <span>South Bend Farmers Market</span>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Discover</div>
        {consumerLinks.map((link) =>
          !user && link.path === "/orders" ? null : (
            <div
              key={link.path}
              className={`sidebar-link ${
                location.pathname === link.path ? "active" : ""
              }`}
              onClick={() => goTo(link.path)}
            >
              <span className="icon">{link.icon}</span>
              {link.label}
            </div>
          )
        )}
      </div>

      {isVendor && (
        <div className="sidebar-section">
          <div className="sidebar-section-label">Vendor</div>
          {vendorLinks.map((link) => (
            <div
              key={link.path}
              className={`sidebar-link ${
                location.pathname === link.path ? "active" : ""
              }`}
              onClick={() => goTo(link.path)}
            >
              <span className="icon">{link.icon}</span>
              {link.label}
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="sidebar-section">
          <div className="sidebar-section-label">Admin</div>
          {adminLinks.map((link) => (
            <div
              key={link.path}
              className={`sidebar-link ${
                location.pathname === link.path ? "active" : ""
              }`}
              onClick={() => goTo(link.path)}
            >
              <span className="icon">{link.icon}</span>
              {link.label}
            </div>
          ))}
        </div>
      )}

      {isOwner && (
        <div className="sidebar-section">
          <div className="sidebar-section-label">Owner</div>
          {ownerLinks.map((link) => (
            <div
              key={link.path}
              className={`sidebar-link ${
                location.pathname === link.path ? "active" : ""
              }`}
              onClick={() => goTo(link.path)}
            >
              <span className="icon">{link.icon}</span>
              {link.label}
            </div>
          ))}
        </div>
      )}

      {!user && (
        <div className="sidebar-section">
          <div className="sidebar-section-label">Vendors</div>
          <div className="sidebar-link" onClick={() => goTo("/vendor/apply")}>
            <span className="icon">
              <IconSprout size={16} />
            </span>
            Apply to sell here
          </div>
        </div>
      )}

      <div className="sidebar-bottom">
        {user ? (
          <>
            <div style={{ padding: "8px 10px 4px" }}>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.3)",
                  textTransform: "uppercase",
                  letterSpacing: "1.2px",
                  marginBottom: 3,
                }}
              >
                Signed in as
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "rgba(255,255,255,0.75)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.email}
              </div>
              <div style={{ marginTop: 6 }}>
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    background:
                      user.role === "owner"
                        ? "rgba(139,92,246,0.25)"
                        : user.role === "admin"
                        ? "rgba(196,154,78,0.2)"
                        : user.role === "vendor"
                        ? "rgba(74,140,92,0.25)"
                        : "rgba(255,255,255,0.1)",
                    color:
                      user.role === "owner"
                        ? "#c4b5fd"
                        : user.role === "admin"
                        ? "var(--wheat-light)"
                        : user.role === "vendor"
                        ? "#7ed4a0"
                        : "rgba(255,255,255,0.4)",
                  }}
                >
                  {user.role}
                </span>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <IconLogOut size={16} />
              Sign out
            </button>
          </>
        ) : (
          <button
            className="logout-btn"
            onClick={() => goTo("/login")}
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            <IconKey size={16} />
            Sign in
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      <aside className="sidebar sidebar-desktop">
        <SidebarContent />
      </aside>

      <button
        className="hamburger-btn"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        style={{ display: open ? "none" : undefined }}
      >
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>

      {open && (
        <div className="sidebar-overlay" onClick={() => setOpen(false)}>
          <aside
            ref={sidebarRef}
            className="sidebar sidebar-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="sidebar-close-btn"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
