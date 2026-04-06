import React, { useEffect, useState } from 'react';
import Parse from '../../lib/parse';
import { useVendors } from '../../hooks/useVendors';
import { useMarketEvents } from '../../hooks/useMarketEvents';

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  byStatus: Record<string, number>;
  byVendor: { name: string; count: number; revenue: number }[];
  byDay: { date: string; count: number; revenue: number }[];
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function BarChart({ data, color = 'var(--forest-mid)' }: { data: { label: string; value: number }[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, paddingBottom: 24, position: 'relative' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{d.value > 0 ? d.value : ''}</div>
          <div style={{
            width: '100%', background: color, borderRadius: '4px 4px 0 0',
            height: `${(d.value / max) * 90}%`, minHeight: d.value > 0 ? 4 : 0,
            transition: 'height 0.4s ease',
          }} />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', position: 'absolute', bottom: 0, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 40 }}>
            {d.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const { vendors } = useVendors();
  const { events } = useMarketEvents();
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'30' | '90' | 'all'>('30');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const query = new Parse.Query('Order');
        if (range !== 'all') {
          const since = new Date();
          since.setDate(since.getDate() - parseInt(range));
          query.greaterThanOrEqualTo('createdAt', since);
        }
        query.limit(1000);
        const orders = await query.find();

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((s, o) => s + (o.get('total') || 0), 0);
        const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

        const byStatus: Record<string, number> = {};
        const vendorMap: Record<string, { count: number; revenue: number }> = {};
        const dayMap: Record<string, { count: number; revenue: number }> = {};

        orders.forEach(o => {
          const status = o.get('status') || 'unknown';
          byStatus[status] = (byStatus[status] || 0) + 1;

          const vSlug = o.get('vendorSlug') || 'unknown';
          const vName = o.get('vendorName') || vSlug;
          if (!vendorMap[vSlug]) vendorMap[vSlug] = { count: 0, revenue: 0 };
          vendorMap[vSlug].count++;
          vendorMap[vSlug].revenue += o.get('total') || 0;

          const day = o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown';
          if (!dayMap[day]) dayMap[day] = { count: 0, revenue: 0 };
          dayMap[day].count++;
          dayMap[day].revenue += o.get('total') || 0;
        });

        const byVendor = Object.entries(vendorMap)
          .map(([slug, data]) => ({
            name: orders.find(o => o.get('vendorSlug') === slug)?.get('vendorName') || slug,
            ...data
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

        // Last 14 days for chart
        const last14: { date: string; count: number; revenue: number }[] = [];
        for (let i = 13; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          last14.push({ date: key, ...(dayMap[key] || { count: 0, revenue: 0 }) });
        }

        setStats({ totalOrders, totalRevenue, avgOrderValue, byStatus, byVendor, byDay: last14 });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [range]);

  const publishedEvents = events.filter(e => e.isPublished).length;
  const activeVendors = vendors.filter(v => v.isActive).length;

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Analytics</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['30', '90', 'all'] as const).map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid',
              borderColor: range === r ? 'var(--forest-mid)' : 'var(--cream-dark)',
              background: range === r ? 'var(--forest-mid)' : 'var(--white)',
              color: range === r ? 'white' : 'var(--text-secondary)',
              fontSize: 12.5, cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 600,
            }}>
              {r === 'all' ? 'All time' : `Last ${r} days`}
            </button>
          ))}
        </div>
      </div>

      <div className="page-content">
        <div className="page-header">
          <h2>Analytics</h2>
          <p>Order trends and platform performance</p>
        </div>

        {/* Top stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <StatBox label="Total Orders" value={loading ? '—' : String(stats?.totalOrders ?? 0)} />
          <StatBox label="Total Revenue" value={loading ? '—' : `$${(stats?.totalRevenue ?? 0).toFixed(2)}`} sub="cash on pickup" />
          <StatBox label="Avg Order Value" value={loading ? '—' : `$${(stats?.avgOrderValue ?? 0).toFixed(2)}`} />
          <StatBox label="Active Vendors" value={String(activeVendors)} sub={`${publishedEvents} published events`} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Orders per day chart */}
          <div className="card">
            <div className="card-header"><h3>Orders — last 14 days</h3></div>
            <div className="card-body">
              {loading ? (
                <div className="loading-spinner" style={{ padding: 24 }}>Loading...</div>
              ) : stats?.byDay && stats.byDay.some(d => d.count > 0) ? (
                <BarChart
                  data={stats.byDay.map(d => ({ label: d.date, value: d.count }))}
                  color="var(--forest-mid)"
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13.5 }}>
                  No orders in this period
                </div>
              )}
            </div>
          </div>

          {/* Order status breakdown */}
          <div className="card">
            <div className="card-header"><h3>Order status breakdown</h3></div>
            <div className="card-body">
              {loading ? (
                <div className="loading-spinner" style={{ padding: 24 }}>Loading...</div>
              ) : stats && Object.keys(stats.byStatus).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(stats.byStatus).map(([status, count]) => {
                    const pct = Math.round((count / stats.totalOrders) * 100);
                    const colors: Record<string, string> = { pending: 'var(--wheat)', confirmed: 'var(--forest-light)', ready: '#4caf50', fulfilled: 'var(--sage)', cancelled: '#e57373' };
                    return (
                      <div key={status}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                          <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize', fontWeight: 500 }}>{status}</span>
                          <span style={{ fontWeight: 700 }}>{count} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span></span>
                        </div>
                        <div style={{ background: 'var(--cream-dark)', borderRadius: 4, height: 7 }}>
                          <div style={{ background: colors[status] || 'var(--sage)', width: `${pct}%`, height: '100%', borderRadius: 4, transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13.5 }}>No orders yet</div>
              )}
            </div>
          </div>

          {/* Top vendors by orders */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header"><h3>Top vendors by orders</h3></div>
            {loading ? (
              <div className="loading-spinner" style={{ padding: 24 }}>Loading...</div>
            ) : stats?.byVendor && stats.byVendor.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Orders</th>
                      <th>Revenue</th>
                      <th>Share of orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byVendor.map((v, i) => {
                      const pct = stats.totalOrders ? Math.round((v.count / stats.totalOrders) * 100) : 0;
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{v.name}</td>
                          <td>{v.count}</td>
                          <td>${v.revenue.toFixed(2)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ flex: 1, background: 'var(--cream-dark)', borderRadius: 4, height: 7 }}>
                                <div style={{ background: 'var(--forest-mid)', width: `${pct}%`, height: '100%', borderRadius: 4 }} />
                              </div>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 32 }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13.5 }}>No order data yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
