import React, { useEffect, useState } from "react";
import { useAuthContext } from "../../context/AuthContext";
import { useVendorOrders, OrderStatus, OrderItem } from "../../hooks/useOrders";
import { useMenuItems } from "../../hooks/useMenuItems";
import { useMarketEvents } from "../../hooks/useMarketEvents";
import { useVendorNotifications } from "../../hooks/useVendorNotifications";
import { formatEventDate, isUpcomingDate } from "../../lib/marketEvents";
import {
  IconShoppingCart,
  IconTrash,
  IconDollar,
  IconLoader,
  IconCheck,
  IconZap,
  IconClock,
  IconCalendar,
  IconPin,
  IconPlus,
} from "../../components/Icons";

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "badge-amber",
  confirmed: "badge-green",
  ready: "badge-green",
  fulfilled: "badge-gray",
  cancelled: "badge-gray",
};

const STATUS_ACTIONS: Record<
  OrderStatus,
  { label: string; next: OrderStatus } | null
> = {
  pending: { label: "Confirm order", next: "confirmed" },
  confirmed: { label: "Mark ready", next: "ready" },
  ready: { label: "Mark fulfilled", next: "fulfilled" },
  fulfilled: null,
  cancelled: null,
};

export default function VendorDashboard() {
  const { user } = useAuthContext();
  const vendorSlug = user?.vendorSlug ?? "";
  console.log("vendorSlug:", vendorSlug);
  const {
    orders,
    loading: oLoading,
    updateStatus,
  } = useVendorOrders(vendorSlug);
  const {
    items,
    loading: mLoading,
    addItem,
    updateInventory,
    deleteItem,
  } = useMenuItems(vendorSlug);
  const { events, loading: eLoading } = useMarketEvents();
  const {
    notifications,
    loading: nLoading,
    markAsRead,
  } = useVendorNotifications(vendorSlug);
  const unreadNotifications = notifications.filter((item) => !item.isRead);
  const [tab, setTab] = useState<"orders" | "menu" | "earnings" | "events">("orders");
  const [orderFilter, setOrderFilter] = useState<"active" | "fulfilled">(
    "active"
  );
  const [showAddItem, setShowAddItem] = useState(false);

  // New menu item form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newInventoryCount, setNewInventoryCount] = useState("0");
  const [addingItem, setAddingItem] = useState(false);
  const [inventoryDrafts, setInventoryDrafts] = useState<Record<string, string>>({});
  const [savingInventoryId, setSavingInventoryId] = useState<string | null>(null);

  useEffect(() => {
    setInventoryDrafts((prev) => {
      const next: Record<string, string> = {};
      items.forEach((item) => {
        next[item.objectId] =
          prev[item.objectId] ?? String(item.inventoryCount ?? 0);
      });
      return next;
    });
  }, [items]);

  const activeOrders = orders.filter(
    (o) => !["fulfilled", "cancelled"].includes(o.status)
  );
  const fulfilledOrders = orders.filter((o) => o.status === "fulfilled");
  const displayOrders =
    orderFilter === "active" ? activeOrders : fulfilledOrders;

  const totalRevenue = fulfilledOrders.reduce((s, o) => s + o.total, 0);
  const totalOrders = fulfilledOrders.length;
  const avgOrder = totalOrders
    ? (totalRevenue / totalOrders).toFixed(2)
    : "0.00";

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPrice) return;
    setAddingItem(true);
    try {
      await addItem({
        name: newName,
        description: newDesc,
        price: parseFloat(newPrice),
        category: newCategory || "General",
        inventoryCount: Number(newInventoryCount || 0),
      });
      setNewName("");
      setNewDesc("");
      setNewPrice("");
      setNewCategory("");
      setNewInventoryCount("0");
      setShowAddItem(false);
    } finally {
      setAddingItem(false);
    }
  };

  const saveInventory = async (itemId: string, nextValue: string) => {
    const parsedValue = Number.parseInt(nextValue || "0", 10);
    const sanitizedValue = Number.isFinite(parsedValue)
      ? Math.max(0, parsedValue)
      : 0;

    setInventoryDrafts((prev) => ({
      ...prev,
      [itemId]: String(sanitizedValue),
    }));
    setSavingInventoryId(itemId);
    try {
      await updateInventory(itemId, sanitizedValue);
    } finally {
      setSavingInventoryId(null);
    }
  };

  const adjustInventory = async (itemId: string, delta: number) => {
    const currentValue = Number(inventoryDrafts[itemId] || 0);
    const nextValue = String(Math.max(0, currentValue + delta));
    setInventoryDrafts((prev) => ({ ...prev, [itemId]: nextValue }));
    await saveInventory(itemId, nextValue);
  };

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Vendor Dashboard</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {activeOrders.length > 0 && (
            <span className="badge badge-amber">
              {activeOrders.length} active order
              {activeOrders.length !== 1 ? "s" : ""}
            </span>
          )}
          {unreadNotifications.length > 0 && (
            <span className="badge badge-green">
              {unreadNotifications.length} new assignment
              {unreadNotifications.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="page-content">
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 28,
            borderBottom: "1px solid var(--cream-dark)",
            paddingBottom: 0,
          }}
        >
          {(["orders", "menu", "earnings", "events"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "10px 20px",
                borderRadius: "8px 8px 0 0",
                border: "none",
                borderBottom:
                  tab === t
                    ? "2px solid var(--green-mid)"
                    : "2px solid transparent",
                background: tab === t ? "var(--white)" : "transparent",
                color: tab === t ? "var(--green-deep)" : "var(--text-muted)",
                fontWeight: tab === t ? 500 : 400,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
                textTransform: "capitalize",
                marginBottom: -1,
              }}
            >
              {t === "orders"
                ? `Orders ${
                    activeOrders.length > 0 ? `(${activeOrders.length})` : ""
                  }`
                : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ORDERS TAB */}
        {tab === "orders" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button
                className={`filter-chip ${
                  orderFilter === "active" ? "active" : ""
                }`}
                onClick={() => setOrderFilter("active")}
              >
                Active ({activeOrders.length})
              </button>
              <button
                className={`filter-chip ${
                  orderFilter === "fulfilled" ? "active" : ""
                }`}
                onClick={() => setOrderFilter("fulfilled")}
              >
                Fulfilled ({fulfilledOrders.length})
              </button>
            </div>

            {oLoading ? (
              <div className="loading-spinner">Loading orders...</div>
            ) : displayOrders.length === 0 ? (
              <div className="empty-state">
                <div style={{ marginBottom: 12 }}>
                  <IconShoppingCart size={36} color="var(--text-muted)" />
                </div>
                <h3>No {orderFilter} orders</h3>
                <p>
                  {orderFilter === "active"
                    ? "New orders will appear here when customers place them"
                    : "Fulfilled orders will appear here"}
                </p>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {displayOrders.map((order) => {
                  const action = STATUS_ACTIONS[order.status];
                  const date = new Date(order.createdAt).toLocaleString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }
                  );
                  return (
                    <div className="card" key={order.objectId}>
                      <div
                        className="card-body"
                        style={{ padding: "16px 20px" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                marginBottom: 6,
                              }}
                            >
                              <span style={{ fontWeight: 500, fontSize: 14 }}>
                                {order.customerEmail.split("@")[0]}
                              </span>
                              <span
                                className={`badge ${
                                  STATUS_COLORS[order.status]
                                }`}
                              >
                                {order.status}
                              </span>
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-muted)",
                                  marginLeft: "auto",
                                }}
                              >
                                {date}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                color: "var(--text-muted)",
                                marginBottom: 8,
                              }}
                            >
                              Pickup: {order.pickupWindow}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                                marginBottom: 8,
                              }}
                            >
                              {(order.items as OrderItem[]).map((item, i) => (
                                <span key={i} className="badge badge-gray">
                                  {item.quantity}× {item.name} — $
                                  {(item.price * item.quantity).toFixed(2)}
                                </span>
                              ))}
                            </div>
                            {order.notes && (
                              <div
                                style={{
                                  fontSize: 13,
                                  color: "var(--text-secondary)",
                                  fontStyle: "italic",
                                }}
                              >
                                Note: {order.notes}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div
                              style={{
                                fontFamily: "Playfair Display, serif",
                                fontSize: 20,
                                color: "var(--green-deep)",
                                marginBottom: 8,
                              }}
                            >
                              ${order.total.toFixed(2)}
                            </div>
                            {action && (
                              <button
                                onClick={() =>
                                  updateStatus(order.objectId, action.next)
                                }
                                className="btn btn-primary"
                                style={{ fontSize: 12, padding: "6px 14px" }}
                              >
                                {action.label}
                              </button>
                            )}
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                                marginTop: 6,
                              }}
                            >
                              Order #{order.orderNumber || order.qrCode}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MENU TAB */}
        {tab === "menu" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div>
                <h3
                  style={{
                    fontFamily: "Playfair Display, serif",
                    fontSize: 18,
                    color: "var(--green-deep)",
                  }}
                >
                  Your Menu
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  {items.length} items · customers can browse and order these
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setShowAddItem(!showAddItem)}
              >
                {showAddItem ? "✕ Cancel" : "+ Add Item"}
              </button>
            </div>

            {showAddItem && (
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header">
                  <h3>New menu item</h3>
                </div>
                <div className="card-body">
                  <form
                    onSubmit={handleAddItem}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <label style={{ fontSize: 13, fontWeight: 500 }}>
                        Name *
                      </label>
                      <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Fresh Strawberries"
                        style={inputStyle}
                        required
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <label style={{ fontSize: 13, fontWeight: 500 }}>
                        Price ($) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        placeholder="0.00"
                        style={inputStyle}
                        required
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <label style={{ fontSize: 13, fontWeight: 500 }}>
                        Category
                      </label>
                      <input
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="e.g. Berries, Baked Goods..."
                        style={inputStyle}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                  <label style={{ fontSize: 13, fontWeight: 500 }}>
                        Starting inventory *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={newInventoryCount}
                        onChange={(e) => setNewInventoryCount(e.target.value)}
                        placeholder="0"
                        style={inputStyle}
                        required
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <label style={{ fontSize: 13, fontWeight: 500 }}>
                        Description
                      </label>
                      <input
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="Short description..."
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={addingItem}
                      >
                        {addingItem ? "Adding..." : "+ Add to Menu"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {mLoading ? (
              <div className="loading-spinner">Loading menu...</div>
            ) : items.length === 0 ? (
              <div className="empty-state">
                <div style={{ marginBottom: 12 }}>
                  <IconShoppingCart size={36} color="var(--text-muted)" />
                </div>
                <h3>No menu items yet</h3>
                <p>Add items so customers can browse and pre-order</p>
              </div>
            ) : (
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Inventory</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.objectId}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{item.name}</div>
                            {item.description && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-muted)",
                                }}
                              >
                                {item.description}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="badge badge-gray">
                              {item.category}
                            </span>
                          </td>
                          <td style={{ fontWeight: 500 }}>
                            ${item.price.toFixed(2)}
                          </td>
                          <td>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <button
                                onClick={() => adjustInventory(item.objectId, -1)}
                                style={qtyButtonStyle}
                                disabled={savingInventoryId === item.objectId}
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={inventoryDrafts[item.objectId] ?? String(item.inventoryCount ?? 0)}
                                onChange={(e) =>
                                  setInventoryDrafts((prev) => ({
                                    ...prev,
                                    [item.objectId]: e.target.value,
                                  }))
                                }
                                onBlur={() =>
                                  saveInventory(
                                    item.objectId,
                                    inventoryDrafts[item.objectId] ?? "0"
                                  )
                                }
                                style={{
                                  width: 72,
                                  ...inputStyle,
                                  padding: "7px 10px",
                                }}
                              />
                              <button
                                onClick={() => adjustInventory(item.objectId, 1)}
                                style={qtyButtonStyle}
                                disabled={savingInventoryId === item.objectId}
                              >
                                <IconPlus size={13} />
                              </button>
                            </div>
                          </td>
                          <td>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                                alignItems: "flex-start",
                              }}
                            >
                              <span
                                className={`badge ${
                                  item.available ? "badge-green" : "badge-gray"
                                }`}
                              >
                                {item.available ? "In stock" : "Out of stock"}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "var(--text-muted)",
                                }}
                              >
                                {item.inventoryCount} remaining
                              </span>
                            </div>
                          </td>
                          <td>
                            <button
                              onClick={() => deleteItem(item.objectId)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--text-muted)",
                                cursor: "pointer",
                                fontSize: 16,
                                padding: "0 4px",
                              }}
                            >
                              <IconTrash size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* EVENTS TAB */}
        {tab === "events" && (
          <div>
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="card-header">
                <h3>Assignment Notifications</h3>
                <span className={`badge ${unreadNotifications.length ? "badge-amber" : "badge-gray"}`}>
                  {unreadNotifications.length} unread
                </span>
              </div>
              <div className="card-body">
                {nLoading ? (
                  <div className="loading-spinner">Loading notifications...</div>
                ) : notifications.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    Assignment updates will appear here when you are assigned or moved to a booth.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {notifications.slice(0, 8).map((notification) => (
                      <button
                        key={notification.objectId}
                        onClick={() => markAsRead(notification.objectId)}
                        style={{
                          border: "1px solid var(--cream-dark)",
                          borderLeft: notification.isRead
                            ? "4px solid #d7d3c8"
                            : "4px solid var(--forest-mid)",
                          borderRadius: 8,
                          background: "var(--white)",
                          textAlign: "left",
                          padding: "10px 12px",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>
                            {notification.eventName}
                          </div>
                          {!notification.isRead && <span className="badge badge-green">New</span>}
                        </div>
                        <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 4 }}>
                          {notification.message}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6 }}>
                          {formatEventDate(notification.eventDate || null, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {notification.marketHours ? ` · ${notification.marketHours}` : ""}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 18, color: "var(--green-deep)" }}>
                Your Market Assignments
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                Events you're scheduled for and your booth number
              </p>
            </div>

            {eLoading ? (
              <div className="loading-spinner">Loading events...</div>
            ) : (() => {
              const vendorEvents = events
                .filter(ev => ev.boothMap.some(b => b.vendorSlug === vendorSlug))
                .map(ev => ({
                  event: ev,
                  booth: ev.boothMap.find(b => b.vendorSlug === vendorSlug)!,
                }));
              const now = new Date();
              const upcoming = vendorEvents.filter(({ event }) =>
                isUpcomingDate(event.date, now)
              );
              const past = vendorEvents.filter(
                ({ event }) => !isUpcomingDate(event.date, now)
              );

              if (vendorEvents.length === 0) {
                return (
                  <div className="empty-state">
                    <div style={{ marginBottom: 12 }}>
                      <IconCalendar size={36} color="var(--text-muted)" />
                    </div>
                    <h3>No event assignments yet</h3>
                    <p>You'll appear here once an admin assigns you to a market event</p>
                  </div>
                );
              }

              const renderEventRow = ({ event, booth }: { event: typeof events[0]; booth: { boothId: string } }) => {
                const isUpcoming = isUpcomingDate(event.date, now);
                return (
                  <div className="card" key={event.objectId} style={{ marginBottom: 12 }}>
                    <div className="card-body" style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                            <span style={{ fontFamily: "Playfair Display, serif", fontSize: 16, color: "var(--green-deep)" }}>
                              {event.name}
                            </span>
                            <span className={`badge ${isUpcoming ? "badge-green" : "badge-gray"}`}>
                              {isUpcoming ? "Upcoming" : "Past"}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>
                            <IconCalendar size={12} color="var(--text-muted)" style={{ marginRight: 5, verticalAlign: "middle" }} />
                            {formatEventDate(event.date, {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                            {event.hours && <span style={{ marginLeft: 10, color: "var(--text-muted)" }}>{event.hours}</span>}
                          </div>
                          {event.address && (
                            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                              <IconPin size={12} color="var(--text-muted)" style={{ marginRight: 5, verticalAlign: "middle" }} />
                              {event.address}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "center", background: "var(--green-pale)", borderRadius: 10, padding: "12px 18px", flexShrink: 0 }}>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 2 }}>Your Booth</div>
                          <div style={{ fontFamily: "Playfair Display, serif", fontSize: 24, color: "var(--green-deep)", fontWeight: 700 }}>
                            {booth.boothId}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              };

              return (
                <div>
                  {upcoming.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", marginBottom: 12 }}>
                        Upcoming ({upcoming.length})
                      </div>
                      {upcoming.map(renderEventRow)}
                    </div>
                  )}
                  {past.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", marginBottom: 12 }}>
                        Past ({past.length})
                      </div>
                      {past.map(renderEventRow)}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* EARNINGS TAB */}
        {tab === "earnings" && (
          <div>
            <div
              className="stats-grid"
              style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
            >
              <div className="stat-card">
                <div className="stat-label">Total Revenue</div>
                <div className="stat-value">${totalRevenue.toFixed(2)}</div>
                <div className="stat-sub">from fulfilled orders</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Orders Fulfilled</div>
                <div className="stat-value">{totalOrders}</div>
                <div className="stat-sub">{activeOrders.length} pending</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Avg Order Value</div>
                <div className="stat-value">${avgOrder}</div>
                <div className="stat-sub">per order</div>
              </div>
            </div>

            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-header">
                <h3>Fulfilled Orders</h3>
              </div>
              {fulfilledOrders.length === 0 ? (
                <div className="card-body">
                  <div className="empty-state" style={{ padding: "24px 0" }}>
                    <div style={{ marginBottom: 12 }}>
                      <IconDollar size={36} color="var(--text-muted)" />
                    </div>
                    <h3>No fulfilled orders yet</h3>
                    <p>Earnings will appear here as you fulfill orders</p>
                  </div>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Pickup</th>
                        <th>Total</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fulfilledOrders.map((order) => (
                        <tr key={order.objectId}>
                          <td>{order.customerEmail.split("@")[0]}</td>
                          <td
                            style={{
                              fontSize: 13,
                              color: "var(--text-secondary)",
                            }}
                          >
                            {(order.items as OrderItem[])
                              .map((i) => `${i.quantity}× ${i.name}`)
                              .join(", ")}
                          </td>
                          <td style={{ fontSize: 13 }}>{order.pickupWindow}</td>
                          <td style={{ fontWeight: 500 }}>
                            ${order.total.toFixed(2)}
                          </td>
                          <td
                            style={{ fontSize: 13, color: "var(--text-muted)" }}
                          >
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 8,
  border: "1px solid var(--cream-dark)",
  fontSize: 14,
  outline: "none",
  fontFamily: "DM Sans, sans-serif",
  background: "var(--cream)",
  color: "var(--text-primary)",
};

const qtyButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  border: "1px solid var(--cream-dark)",
  background: "var(--white)",
  color: "var(--text-primary)",
  cursor: "pointer",
};
