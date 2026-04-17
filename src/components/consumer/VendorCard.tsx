import React from "react";
import { useNavigate } from "react-router-dom";
import { Vendor } from "../../hooks/useVendors";
import {
  IconLeaf,
  IconJar,
  IconUtensilsCrossed,
  IconPin,
  IconZap,
} from "../Icons";

const CategoryIcon = ({ category }: { category: string }) => {
  if (category === "Farmers, Fishers, Foragers")
    return <IconLeaf size={40} color="#2d5a3d" />;
  if (category === "Food & Beverage Producers")
    return <IconJar size={40} color="#c8841a" />;
  if (category === "Prepared Food")
    return <IconUtensilsCrossed size={40} color="#b4642e" />;
  return <IconLeaf size={40} color="#888780" />;
};

export default function VendorCard({ vendor }: { vendor: Vendor }) {
  const navigate = useNavigate();
  return (
    <div
      className="vendor-card"
      onClick={() => navigate(`/vendors/${vendor.slug}`)}
    >
      <div className="vendor-card-img">
        {vendor.logoUrl ? (
          <img
            src={vendor.logoUrl}
            alt={vendor.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <CategoryIcon category={vendor.category} />
        )}
      </div>
      <div className="vendor-card-body">
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <div className="vendor-card-name" style={{ marginBottom: 0 }}>
            {vendor.name}
          </div>
          {vendor.acceptsPreOrder && (
            <span
              className="badge badge-amber"
              style={{ whiteSpace: "nowrap", marginTop: 2 }}
            >
              Pre-order
            </span>
          )}
        </div>
        <div className="vendor-card-desc">{vendor.description}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          <span className="badge badge-gray">{vendor.subcategory || vendor.category}</span>
          {vendor.isOrganic && (
            <span className="badge badge-green">Organic</span>
          )}
        </div>
        <div className="vendor-card-meta">
          <span
            className="vendor-card-location"
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <IconPin size={12} color="var(--text-muted)" />
            {vendor.location}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-muted)" }}>
            {vendor.acceptsPreOrder && <IconZap size={12} color="var(--wheat)" />}
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--forest-mid)" }}>
              View shop
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
