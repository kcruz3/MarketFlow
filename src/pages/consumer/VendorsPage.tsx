import React, { useState } from "react";
import { useVendors } from "../../hooks/useVendors";
import VendorCard from "../../components/consumer/VendorCard";

const CATEGORIES = [
  "All",
  "Farmers, Fishers, Foragers",
  "Food & Beverage Producers",
  "Prepared Food",
];

export default function VendorsPage() {
  const { vendors, loading, error } = useVendors();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = vendors.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.description?.toLowerCase().includes(search.toLowerCase()) ||
      v.location?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || v.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Vendors</div>
      </div>

      <div className="page-content">
        <div className="hero-panel">
          <div>
            <div className="hero-eyebrow">Browse the market</div>
            <h2>Discover local vendors worth coming back for.</h2>
            <div className="hero-copy">
              Search by farm, product type, or location to quickly find the stands
              you want to visit, preorder from, or save for later.
            </div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-label">Live directory</div>
            <div className="hero-stat-value">{vendors.length}</div>
            <div className="hero-stat-copy">
              vendors currently listed across produce, pantry goods, and prepared food.
            </div>
          </div>
        </div>

        <div className="toolbar-panel">
          <input
            type="text"
            placeholder="Search vendors, locations, or specialties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="modern-input"
            style={{ minWidth: 260, flex: 1 }}
          />
          <div className="filter-bar" style={{ marginBottom: 0 }}>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={`filter-chip ${category === c ? "active" : ""}`}
                onClick={() => setCategory(c)}
              >
                {c === "All" ? "All vendors" : c}
              </button>
            ))}
          </div>
        </div>

        {!loading && !error && filtered.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 18,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
              Showing <strong style={{ color: "var(--forest)" }}>{filtered.length}</strong>{" "}
              vendor{filtered.length !== 1 ? "s" : ""}
              {category !== "All" ? ` in ${category}` : ""}
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-spinner">Loading vendors...</div>
        ) : error ? (
          <div className="empty-state">
            <h3>Could not load vendors</h3>
            <p>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <h3>No vendors found</h3>
            <p>Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="vendor-grid">
            {filtered.map((vendor) => (
              <VendorCard key={vendor.objectId} vendor={vendor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
