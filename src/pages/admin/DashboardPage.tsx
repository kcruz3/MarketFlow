import React from "react";
import { useVendors } from "../../hooks/useVendors";
import { useMarketEvents } from "../../hooks/useMarketEvents";
import EventList from "../../components/admin/EventList";
import { IconCalendar } from "../../components/Icons";

export default function DashboardPage() {
  const { vendors, loading: vLoading } = useVendors();
  const { events, loading: eLoading } = useMarketEvents();

  const activeVendors = vendors.filter((v) => v.isActive).length;
  const organicVendors = vendors.filter((v) => v.isOrganic).length;
  const preOrderVendors = vendors.filter((v) => v.acceptsPreOrder).length;
  const upcomingEvents = events.filter(
    (e) => new Date(e.date) >= new Date()
  ).length;

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Admin Dashboard</div>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          South Bend Farmers Market · 2026 Season
        </span>
      </div>

      <div className="page-content">
        <div className="page-header">
          <h2>Overview</h2>
          <p>Everything at a glance for the 2026 season</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Vendors</div>
            <div className="stat-value">{vLoading ? "—" : vendors.length}</div>
            <div className="stat-sub">{activeVendors} active</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Organic Vendors</div>
            <div className="stat-value">{vLoading ? "—" : organicVendors}</div>
            <div className="stat-sub">of {vendors.length} total</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pre-order Enabled</div>
            <div className="stat-value">{vLoading ? "—" : preOrderVendors}</div>
            <div className="stat-sub">vendors accepting orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Upcoming Events</div>
            <div className="stat-value">{eLoading ? "—" : upcomingEvents}</div>
            <div className="stat-sub">{events.length} total scheduled</div>
          </div>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
        >
          <div className="card">
            <div className="card-header">
              <h3>Upcoming Market Dates</h3>
              <button
                className="btn btn-primary"
                style={{ fontSize: 12, padding: "6px 14px" }}
              >
                + Add Event
              </button>
            </div>
            <div className="card-body">
              {eLoading ? (
                <div className="loading-spinner" style={{ padding: 24 }}>
                  Loading...
                </div>
              ) : (
                <EventList events={events.slice(0, 5)} />
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Vendor Categories</h3>
            </div>
            <div className="card-body">
              {[
                "Farmers, Fishers, Foragers",
                "Food & Beverage Producers",
                "Prepared Food",
              ].map((cat) => {
                const count = vendors.filter((v) => v.category === cat).length;
                const pct = vendors.length
                  ? Math.round((count / vendors.length) * 100)
                  : 0;
                return (
                  <div key={cat} style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ color: "var(--text-secondary)" }}>
                        {cat}
                      </span>
                      <span style={{ fontWeight: 500 }}>{count}</span>
                    </div>
                    <div
                      style={{
                        background: "var(--cream-dark)",
                        borderRadius: 4,
                        height: 6,
                      }}
                    >
                      <div
                        style={{
                          background: "var(--forest-mid)",
                          width: `${pct}%`,
                          height: "100%",
                          borderRadius: 4,
                          transition: "width 0.6s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
