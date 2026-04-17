import React, { useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { useCustomerOrders, Order, OrderItem, OrderStatus } from '../../hooks/useOrders';
import { IconShoppingCart, IconQrCode, IconClock } from '../../components/Icons';

const STATUS_STYLES: Record<OrderStatus, { bg: string; color: string; label: string }> = {
  pending:   { bg: 'var(--wheat-pale)', color: 'var(--bark)', label: 'Pending' },
  confirmed: { bg: 'var(--sage-pale)', color: 'var(--forest-mid)', label: 'Confirmed' },
  ready:     { bg: '#e8f5e9', color: '#2e7d32', label: 'Ready for pickup' },
  fulfilled: { bg: 'var(--cream-mid)', color: 'var(--text-secondary)', label: 'Fulfilled' },
  cancelled: { bg: '#fdecea', color: '#c62828', label: 'Cancelled' },
};

function OrderNumberDisplay({ code }: { code: string }) {
  return (
    <div style={{
      background: 'var(--forest)',
      borderRadius: 12,
      padding: '16px 20px',
      textAlign: 'center',
      minWidth: 140,
    }}>
      <div style={{ marginBottom: 8, opacity: 0.5, display: 'flex', justifyContent: 'center' }}>
        <IconQrCode size={36} color="white" />
      </div>
      <div style={{
        fontFamily: 'monospace',
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--wheat-light)',
        letterSpacing: 2,
      }}>
        {code}
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>
        Show at pickup
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_STYLES[order.status];
  const date = new Date(order.createdAt);
  const isActive = !['fulfilled', 'cancelled'].includes(order.status);
  const pickupCode = order.orderNumber || order.qrCode;

  return (
    <div style={{
      background: 'var(--white)',
      borderRadius: 24,
      border: `1px solid ${isActive ? 'rgba(179, 208, 188, 0.95)' : 'rgba(221, 207, 187, 0.95)'}`,
      overflow: 'hidden',
      transition: 'border-color 0.15s',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Header */}
      <div
        style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, color: 'var(--forest)', fontWeight: 700 }}>
              {order.vendorName}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 999,
              background: status.bg, color: status.color,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              {status.label}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <IconClock size={11} color="var(--text-muted)" /> {order.pickupWindow}
            </span>
            <span>{(order.items as OrderItem[]).length} item{(order.items as OrderItem[]).length !== 1 ? 's' : ''}</span>
          </div>
          {isActive && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 8,
                padding: '10px 14px',
                borderRadius: 16,
                background: 'linear-gradient(180deg, rgba(237,245,239,0.95), rgba(255,255,255,0.98))',
                border: '1px solid rgba(179, 208, 188, 0.95)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}
              >
                Order number
              </span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  color: 'var(--forest)',
                }}
              >
                {pickupCode}
              </span>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, color: 'var(--forest)' }}>
            ${order.total.toFixed(2)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>cash at pickup</div>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 4 }}>
          {expanded ? '▲' : '▼'}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--cream-mid)', padding: '20px 24px 24px', display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Items */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 10 }}>
              Items ordered
            </div>
            {(order.items as OrderItem[]).map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < order.items.length - 1 ? '1px solid var(--cream-mid)' : 'none' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Qty: {item.quantity} × ${item.price.toFixed(2)}</div>
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>${(item.price * item.quantity).toFixed(2)}</div>
              </div>
            ))}
            {order.notes && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--cream)', borderRadius: 8, fontSize: 12.5, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                Note: {order.notes}
              </div>
            )}
          </div>

          {/* Order number — show for active orders */}
          {isActive && (
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 10 }}>
                Order number
              </div>
              <OrderNumberDisplay code={pickupCode} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrderHistoryPage() {
  const { user } = useAuthContext();
  const { orders, loading } = useCustomerOrders(user?.objectId ?? '');
  const [tab, setTab] = useState<'active' | 'past'>('active');

  const activeOrders = orders.filter(o => !['fulfilled', 'cancelled'].includes(o.status));
  const pastOrders = orders.filter(o => ['fulfilled', 'cancelled'].includes(o.status));
  const display = tab === 'active' ? activeOrders : pastOrders;

  const totalSpent = pastOrders
    .filter(o => o.status === 'fulfilled')
    .reduce((s, o) => s + o.total, 0);

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">My Orders</div>
      </div>

      <div className="page-content">
        <div className="hero-panel">
          <div>
            <div className="hero-eyebrow">Customer orders</div>
            <h2>Your pickups, all in one place.</h2>
            <div className="hero-copy">
              Keep track of what you ordered, when to pick it up, and the order
              number you’ll show at the booth.
            </div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-label">Ready to pick up</div>
            <div className="hero-stat-value">{activeOrders.length}</div>
            <div className="hero-stat-copy">
              active order{activeOrders.length !== 1 ? "s" : ""} waiting for pickup or confirmation.
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Total Orders</div>
            <div className="stat-value">{orders.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active</div>
            <div className="stat-value" style={{ color: 'var(--forest-mid)' }}>{activeOrders.length}</div>
            <div className="stat-sub">awaiting pickup</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Spent</div>
            <div className="stat-value">${totalSpent.toFixed(2)}</div>
            <div className="stat-sub">across {pastOrders.filter(o => o.status === 'fulfilled').length} orders</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="section-tabs">
          {(['active', 'past'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`section-tab ${tab === t ? 'active' : ''}`}
            >
              {t === 'active' ? `Active (${activeOrders.length})` : `Past (${pastOrders.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-spinner">Loading orders...</div>
        ) : display.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><IconShoppingCart size={40} color="var(--text-muted)" /></div>
            <h3>{tab === 'active' ? 'No active orders' : 'No past orders'}</h3>
            <p>{tab === 'active' ? 'Place a pre-order from any vendor page' : 'Your completed orders will appear here'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {display.map(order => <OrderCard key={order.objectId} order={order} />)}
          </div>
        )}
      </div>
    </div>
  );
}
