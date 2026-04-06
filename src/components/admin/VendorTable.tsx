import React, { useState } from "react";
import { Vendor } from "../../hooks/useVendors";
import VendorEditModal from "./VendorEditModal";
import { IconEdit } from "../Icons";

interface Props {
  vendors: Vendor[];
  onRefresh: () => void;
}

export default function VendorTable({ vendors, onRefresh }: Props) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Vendor | null>(null);

  const filtered = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase()) ||
      v.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h3>All Vendors ({vendors.length})</h3>
          <input
            type="text"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "7px 14px",
              borderRadius: 20,
              border: "1px solid var(--cream-dark)",
              fontSize: 13,
              outline: "none",
              background: "var(--cream)",
              fontFamily: "Nunito, sans-serif",
            }}
          />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Location</th>
                <th>Booth</th>
                <th>Status</th>
                <th>Pre-order</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.objectId}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{v.name}</div>
                    {v.isOrganic && (
                      <span
                        className="badge badge-green"
                        style={{ marginTop: 4 }}
                      >
                        Organic
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-gray">
                      {v.subcategory || v.category}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                    {v.location || "—"}
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                    {v.boothNumber || "—"}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        v.isActive ? "badge-green" : "badge-gray"
                      }`}
                    >
                      {v.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        v.acceptsPreOrder ? "badge-amber" : "badge-gray"
                      }`}
                    >
                      {v.acceptsPreOrder ? "Yes" : "No"}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => setEditing(v)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 11px",
                        borderRadius: 7,
                        border: "1px solid var(--cream-dark)",
                        background: "var(--white)",
                        cursor: "pointer",
                        fontSize: 12.5,
                        color: "var(--text-secondary)",
                        fontFamily: "Nunito, sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      <IconEdit size={13} />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      padding: 32,
                      color: "var(--text-muted)",
                    }}
                  >
                    No vendors match your search
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <VendorEditModal
          vendor={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
