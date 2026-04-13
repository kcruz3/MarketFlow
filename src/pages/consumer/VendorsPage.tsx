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
        <div className="page-header">
          <h2>All Vendors</h2>
          <p>Browse vendors at South Bend Farmers Market</p>
        </div>

        {/* Search + filter */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "8px 16px",
              borderRadius: 20,
              border: "1px solid var(--cream-dark)",
              fontSize: 13,
              outline: "none",
              background: "var(--cream)",
              fontFamily: "DM Sans, sans-serif",
              minWidth: 200,
            }}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
