import React, { useEffect, useMemo, useState } from "react";
import {
  Vendor,
  VendorLinkableUser,
  createVendorAsAdmin,
  deleteVendorAndUser,
  getUsersForVendorLinking,
  linkVendorToUser,
} from "../../hooks/useVendors";
import VendorEditModal from "./VendorEditModal";
import { IconEdit, IconPlus, IconUsers } from "../Icons";

interface Props {
  vendors: Vendor[];
  onRefresh: () => void;
}

export default function VendorTable({ vendors, onRefresh }: Props) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [users, setUsers] = useState<VendorLinkableUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingLink, setSavingLink] = useState(false);
  const [linkVendorId, setLinkVendorId] = useState("");
  const [linkUserId, setLinkUserId] = useState("");
  const [createForm, setCreateForm] = useState({
    name: "",
    category: "Prepared Food",
    subcategory: "",
    description: "",
    location: "",
    website: "",
    userId: "",
  });

  const filtered = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase()) ||
      v.location?.toLowerCase().includes(search.toLowerCase())
  );

  const userById = useMemo(
    () => new Map(users.map((u) => [u.objectId, u])),
    [users]
  );

  const loadUsers = async () => {
    if (usersLoading || users.length > 0) return;
    setUsersLoading(true);
    setUsersError("");
    try {
      const list = await getUsersForVendorLinking();
      setUsers(list);
    } catch (e: any) {
      setUsersError(e?.message || "Could not load users for linking.");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (showCreateModal || showLinkModal) {
      loadUsers();
    }
  }, [showCreateModal, showLinkModal]);

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      alert("Vendor name is required.");
      return;
    }

    setSavingCreate(true);
    try {
      await createVendorAsAdmin({
        name: createForm.name,
        category: createForm.category,
        subcategory: createForm.subcategory,
        description: createForm.description,
        location: createForm.location,
        website: createForm.website,
        userId: createForm.userId || undefined,
      });
      setShowCreateModal(false);
      setCreateForm({
        name: "",
        category: "Prepared Food",
        subcategory: "",
        description: "",
        location: "",
        website: "",
        userId: "",
      });
      await onRefresh();
    } catch (e: any) {
      alert(e?.message || "Unable to create vendor.");
    } finally {
      setSavingCreate(false);
    }
  };

  const handleLinkVendorToUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkVendorId || !linkUserId) {
      alert("Please select both a vendor and a user.");
      return;
    }
    setSavingLink(true);
    try {
      await linkVendorToUser(linkVendorId, linkUserId);
      setShowLinkModal(false);
      setLinkVendorId("");
      setLinkUserId("");
      await onRefresh();
    } catch (e: any) {
      alert(e?.message || "Unable to link vendor and user.");
    } finally {
      setSavingLink(false);
    }
  };

  const unlinkedVendors = vendors.filter((vendor) => !vendor.ownerId);

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h3>All Vendors ({vendors.length})</h3>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => setShowCreateModal(true)}
              style={s.ghostBtn}
            >
              <IconPlus size={13} />
              Add Vendor
            </button>
            <button
              onClick={() => setShowLinkModal(true)}
              style={s.ghostBtn}
            >
              <IconUsers size={13} />
              Connect User
            </button>
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
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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

                      <button
                        onClick={async () => {
                          const ok = window.confirm(
                            `Delete ${v.name}? This removes the vendor listing.`
                          );
                          if (!ok) return;

                          try {
                            await deleteVendorAndUser(v.objectId, v.ownerId);
                            onRefresh();
                          } catch (err: any) {
                            alert(
                              err.message ||
                                "Failed to delete vendor. If this says insufficient auth, the Vendor class delete permissions need to allow admins."
                            );
                          }
                        }}
                        style={{
                          padding: "5px 11px",
                          borderRadius: 7,
                          border: "1px solid #e0b4b4",
                          background: "#fff5f5",
                          cursor: "pointer",
                          fontSize: 12.5,
                          color: "#b42318",
                          fontFamily: "Nunito, sans-serif",
                          fontWeight: 600,
                        }}
                      >
                        Delete
                      </button>
                    </div>
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

      {showCreateModal && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Add Vendor</h3>
              <button style={s.closeBtn} onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>
            <form style={s.modalBody} onSubmit={handleCreateVendor}>
              <label style={s.label}>
                Business name *
                <input
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                  style={s.input}
                  placeholder="Sweet Corn Collective"
                />
              </label>
              <label style={s.label}>
                Category
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, category: e.target.value }))}
                  style={s.input}
                >
                  <option value="Prepared Food">Prepared Food</option>
                  <option value="Food & Beverage Producers">Food & Beverage Producers</option>
                  <option value="Farmers, Fishers, Foragers">Farmers, Fishers, Foragers</option>
                </select>
              </label>
              <label style={s.label}>
                Subcategory
                <input
                  value={createForm.subcategory}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, subcategory: e.target.value }))
                  }
                  style={s.input}
                  placeholder="Bakery, Greens, Seafood..."
                />
              </label>
              <label style={s.label}>
                Location
                <input
                  value={createForm.location}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, location: e.target.value }))}
                  style={s.input}
                  placeholder="South Bend, IN"
                />
              </label>
              <label style={s.label}>
                Website
                <input
                  value={createForm.website}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, website: e.target.value }))}
                  style={s.input}
                  placeholder="https://..."
                />
              </label>
              <label style={s.label}>
                Link to user now (optional)
                <select
                  value={createForm.userId}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, userId: e.target.value }))}
                  style={s.input}
                  disabled={usersLoading}
                >
                  <option value="">No linked user yet</option>
                  {users.map((user) => (
                    <option key={user.objectId} value={user.objectId}>
                      {(user.email || user.username || user.objectId) +
                        (user.vendorSlug ? ` · linked:${user.vendorSlug}` : "")}
                    </option>
                  ))}
                </select>
              </label>
              {usersError && <div style={s.error}>{usersError}</div>}
              <label style={s.label}>
                Description
                <textarea
                  rows={3}
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  style={{ ...s.input, resize: "vertical" }}
                  placeholder="Short vendor description"
                />
              </label>
              <div style={s.actions}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" style={s.saveBtn} disabled={savingCreate}>
                  {savingCreate ? "Creating..." : "Create Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLinkModal && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && setShowLinkModal(false)}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Connect Vendor to User</h3>
              <button style={s.closeBtn} onClick={() => setShowLinkModal(false)}>
                ✕
              </button>
            </div>
            <form style={s.modalBody} onSubmit={handleLinkVendorToUser}>
              <label style={s.label}>
                Vendor
                <select
                  value={linkVendorId}
                  onChange={(e) => setLinkVendorId(e.target.value)}
                  style={s.input}
                  disabled={savingLink}
                >
                  <option value="">Select a vendor</option>
                  {(unlinkedVendors.length > 0 ? unlinkedVendors : vendors).map((vendor) => (
                    <option key={vendor.objectId} value={vendor.objectId}>
                      {vendor.name} ({vendor.slug})
                      {vendor.ownerId ? " · currently linked" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label style={s.label}>
                User account
                <select
                  value={linkUserId}
                  onChange={(e) => setLinkUserId(e.target.value)}
                  style={s.input}
                  disabled={usersLoading || savingLink}
                >
                  <option value="">Select a user</option>
                  {users.map((user) => (
                    <option key={user.objectId} value={user.objectId}>
                      {(user.email || user.username || user.objectId) +
                        ` · ${user.role}` +
                        (user.vendorSlug ? ` · linked:${user.vendorSlug}` : "")}
                    </option>
                  ))}
                </select>
              </label>
              {usersError && <div style={s.error}>{usersError}</div>}
              {linkVendorId && (
                <div style={s.info}>
                  Existing vendor owner:{" "}
                  {vendors.find((v) => v.objectId === linkVendorId)?.ownerId
                    ? userById.get(vendors.find((v) => v.objectId === linkVendorId)!.ownerId || "")
                        ?.email ||
                      vendors.find((v) => v.objectId === linkVendorId)!.ownerId
                    : "None"}
                </div>
              )}
              <div style={s.actions}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowLinkModal(false)}>
                  Cancel
                </button>
                <button type="submit" style={s.saveBtn} disabled={savingLink}>
                  {savingLink ? "Saving..." : "Connect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  ghostBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid var(--cream-dark)",
    background: "var(--white)",
    cursor: "pointer",
    fontSize: 12.5,
    color: "var(--text-secondary)",
    fontFamily: "Nunito, sans-serif",
    fontWeight: 700,
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(20,30,20,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1200,
    padding: 18,
  },
  modal: {
    width: "100%",
    maxWidth: 600,
    background: "var(--white)",
    borderRadius: 16,
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid var(--cream-mid)",
  },
  modalTitle: {
    margin: 0,
    fontSize: 20,
    fontFamily: "Playfair Display, serif",
    color: "var(--forest)",
  },
  closeBtn: {
    border: "none",
    background: "none",
    color: "var(--text-muted)",
    fontSize: 16,
    cursor: "pointer",
  },
  modalBody: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 20,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    fontSize: 12,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: 700,
  },
  input: {
    border: "1px solid var(--cream-dark)",
    borderRadius: 8,
    padding: "9px 11px",
    fontSize: 14,
    fontFamily: "Nunito, sans-serif",
    background: "var(--cream)",
    color: "var(--text-primary)",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    padding: "9px 14px",
    borderRadius: 8,
    border: "1px solid var(--cream-dark)",
    background: "var(--cream)",
    color: "var(--text-secondary)",
    fontFamily: "Nunito, sans-serif",
    cursor: "pointer",
  },
  saveBtn: {
    padding: "9px 14px",
    borderRadius: 8,
    border: "none",
    background: "var(--forest-mid)",
    color: "#fff",
    fontFamily: "Nunito, sans-serif",
    fontWeight: 700,
    cursor: "pointer",
  },
  error: {
    background: "#fff0f0",
    border: "1px solid #ffcdd2",
    color: "#c62828",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 13,
  },
  info: {
    background: "var(--cream)",
    border: "1px solid var(--cream-dark)",
    color: "var(--text-secondary)",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 13,
  },
};
