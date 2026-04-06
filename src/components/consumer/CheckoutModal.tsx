import React, { useState } from "react";
import { useAuthContext } from "../../context/AuthContext";
import { MenuItem } from "../../hooks/useMenuItems";
import { createOrder, OrderItem } from "../../hooks/useOrders";

interface Props {
  vendorSlug: string;
  vendorName: string;
  items: MenuItem[];
  onClose: () => void;
  onOrderPlaced: (qrCode: string) => void;
}

const PICKUP_WINDOWS = [
  "10:00 – 10:30 AM",
  "10:30 – 11:00 AM",
  "11:00 – 11:30 AM",
  "11:30 AM – 12:00 PM",
  "12:00 – 12:30 PM",
  "12:30 – 1:00 PM",
  "1:00 – 1:30 PM",
  "1:30 – 2:00 PM",
  "2:00 – 2:30 PM",
  "2:30 – 3:00 PM",
];

export default function CheckoutModal({
  vendorSlug,
  vendorName,
  items,
  onClose,
  onOrderPlaced,
}: Props) {
  const { user } = useAuthContext();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [pickupWindow, setPickupWindow] = useState("");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  const availableItems = items.filter((i) => i.available);

  const updateQty = (itemId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[itemId] ?? 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const cartItems: OrderItem[] = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const item = items.find((i) => i.objectId === id)!;
      return {
        menuItemId: id,
        name: item.name,
        price: item.price,
        quantity: qty,
      };
    });

  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const hasItems = cartItems.length > 0;

  const handlePlaceOrder = async () => {
    if (!hasItems) {
      setError("Please add at least one item");
      return;
    }
    if (!pickupWindow) {
      setError("Please select a pickup time");
      return;
    }
    if (!user) {
      setError("You must be logged in");
      return;
    }

    setPlacing(true);
    setError("");
    try {
      const order = await createOrder({
        customerId: user.objectId,
        customerEmail: user.email,
        vendorSlug,
        vendorName,
        items: cartItems,
        pickupWindow,
        notes,
      });
      onOrderPlaced(order.qrCode);
    } catch (e: any) {
      setError(e.message || "Failed to place order");
      setPlacing(false);
    }
  };

  return (
    <div
      style={s.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={s.modal}>
        <div style={s.header}>
          <div>
            <h2 style={s.title}>Order from {vendorName}</h2>
            <p
              style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}
            >
              Cash on pickup · No payment required now
            </p>
          </div>
          <button onClick={onClose} style={s.closeBtn}>
            ✕
          </button>
        </div>

        <div style={s.body}>
          {error && <div style={s.error}>{error}</div>}

          {/* Items */}
          <h3 style={s.sectionTitle}>Menu</h3>
          {availableItems.length === 0 ? (
            <p
              style={{
                fontSize: 14,
                color: "var(--text-muted)",
                marginBottom: 20,
              }}
            >
              No items currently available
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: 24,
              }}
            >
              {availableItems.map((item) => {
                const qty = cart[item.objectId] ?? 0;
                return (
                  <div key={item.objectId} style={s.itemRow}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>
                        {item.name}
                      </div>
                      {item.description && (
                        <div
                          style={{ fontSize: 12, color: "var(--text-muted)" }}
                        >
                          {item.description}
                        </div>
                      )}
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <span
                        style={{
                          fontWeight: 500,
                          fontSize: 14,
                          minWidth: 52,
                          textAlign: "right",
                        }}
                      >
                        ${item.price.toFixed(2)}
                      </span>
                      <div style={s.qtyControl}>
                        <button
                          onClick={() => updateQty(item.objectId, -1)}
                          style={s.qtyBtn}
                          disabled={qty === 0}
                        >
                          −
                        </button>
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            minWidth: 20,
                            textAlign: "center",
                          }}
                        >
                          {qty}
                        </span>
                        <button
                          onClick={() => updateQty(item.objectId, 1)}
                          style={s.qtyBtn}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pickup window */}
          <h3 style={s.sectionTitle}>Pickup time</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 8,
              marginBottom: 20,
            }}
          >
            {PICKUP_WINDOWS.map((w) => (
              <button
                key={w}
                onClick={() => setPickupWindow(w)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor:
                    pickupWindow === w
                      ? "var(--forest-mid)"
                      : "var(--cream-dark)",
                  background:
                    pickupWindow === w ? "var(--sage-pale)" : "var(--cream)",
                  color:
                    pickupWindow === w
                      ? "var(--forest)"
                      : "var(--text-secondary)",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                  fontWeight: pickupWindow === w ? 500 : 400,
                }}
              >
                {w}
              </button>
            ))}
          </div>

          {/* Notes */}
          <h3 style={s.sectionTitle}>
            Notes{" "}
            <span
              style={{
                fontWeight: 400,
                color: "var(--text-muted)",
                fontSize: 12,
              }}
            >
              (optional)
            </span>
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special requests or allergies..."
            rows={2}
            style={{ ...s.textarea, marginBottom: 0 }}
          />
        </div>

        {/* Footer with total */}
        <div style={s.footer}>
          <div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 2,
              }}
            >
              Order total
            </div>
            <div
              style={{
                fontFamily: "Playfair Display, serif",
                fontSize: 24,
                color: "var(--forest)",
              }}
            >
              ${subtotal.toFixed(2)}
              <span
                style={{
                  fontSize: 13,
                  fontFamily: "DM Sans, sans-serif",
                  color: "var(--text-muted)",
                  marginLeft: 6,
                }}
              >
                cash at pickup
              </span>
            </div>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={placing || !hasItems || !pickupWindow}
            style={{
              ...s.placeBtn,
              opacity: placing || !hasItems || !pickupWindow ? 0.5 : 1,
            }}
          >
            {placing ? "Placing order..." : "Place order →"}
          </button>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    background: "var(--white)",
    borderRadius: 16,
    width: "100%",
    maxWidth: 560,
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: "24px 28px 16px",
    borderBottom: "1px solid var(--cream-dark)",
  },
  title: {
    fontFamily: "Playfair Display, serif",
    fontSize: 20,
    color: "var(--forest)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
    color: "var(--text-muted)",
    padding: "4px 8px",
  },
  body: { flex: 1, overflowY: "auto", padding: "20px 28px" },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: "var(--text-primary)",
    marginBottom: 12,
  },
  error: {
    background: "#fff0f0",
    border: "1px solid #ffcdd2",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: "#c62828",
    marginBottom: 16,
  },
  itemRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 8,
    border: "1px solid var(--cream-dark)",
    background: "var(--cream)",
  },
  qtyControl: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "white",
    border: "1px solid var(--cream-dark)",
    borderRadius: 8,
    padding: "2px 8px",
  },
  qtyBtn: {
    background: "none",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
    color: "var(--forest-mid)",
    padding: "2px 4px",
    lineHeight: 1,
  },
  textarea: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid var(--cream-dark)",
    fontSize: 14,
    fontFamily: "DM Sans, sans-serif",
    outline: "none",
    background: "var(--cream)",
    resize: "none",
    boxSizing: "border-box" as const,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 28px",
    borderTop: "1px solid var(--cream-dark)",
    background: "var(--cream)",
  },
  placeBtn: {
    padding: "12px 28px",
    borderRadius: 8,
    border: "none",
    background: "var(--forest-mid)",
    color: "white",
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
  },
};
