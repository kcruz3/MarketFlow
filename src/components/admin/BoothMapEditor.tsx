import React, { useState } from 'react';
import { Vendor } from '../../hooks/useVendors';

interface BoothAssignment {
  [boothId: string]: string; // boothId -> vendor slug
}

interface Props {
  vendors: Vendor[];
  value: BoothAssignment;
  onChange: (map: BoothAssignment) => void;
}

const ROWS = 4;
const COLS = 6;
const BOOTHS = Array.from({ length: ROWS * COLS }, (_, i) => {
  const row = String.fromCharCode(65 + Math.floor(i / COLS));
  const col = (i % COLS) + 1;
  return `${row}${col}`;
});

export default function BoothMapEditor({ vendors, value, onChange }: Props) {
  const [selectedBooth, setSelectedBooth] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const assignedSlugs = new Set(Object.values(value));

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) &&
    !assignedSlugs.has(v.slug)
  );

  const getVendorForBooth = (boothId: string) => {
    const slug = value[boothId];
    return vendors.find(v => v.slug === slug);
  };

  const assignVendor = (vendorSlug: string) => {
    if (!selectedBooth) return;
    onChange({ ...value, [selectedBooth]: vendorSlug });
    setSelectedBooth(null);
    setSearch('');
  };

  const clearBooth = (boothId: string) => {
    const next = { ...value };
    delete next[boothId];
    onChange(next);
    if (selectedBooth === boothId) setSelectedBooth(null);
  };

  return (
    <div style={s.wrap}>
      <div style={s.legend}>
        <span style={{ ...s.legendDot, background: 'var(--green-pale)', border: '2px solid var(--green-light)' }} /> Empty
        <span style={{ ...s.legendDot, background: '#e8f0e9', border: '2px solid var(--green-mid)' }} /> Assigned
        <span style={{ ...s.legendDot, background: '#fef3dc', border: '2px solid var(--amber)' }} /> Selected
      </div>

      {/* Grid */}
      <div style={s.grid}>
        {/* Column headers */}
        <div style={s.cornerCell} />
        {[1,2,3,4,5,6].map(c => (
          <div key={c} style={s.colHeader}>{c}</div>
        ))}

        {/* Rows */}
        {Array.from({ length: ROWS }, (_, r) => {
          const rowLabel = String.fromCharCode(65 + r);
          return (
            <React.Fragment key={rowLabel}>
              <div style={s.rowHeader}>{rowLabel}</div>
              {Array.from({ length: COLS }, (_, c) => {
                const boothId = `${rowLabel}${c + 1}`;
                const vendor = getVendorForBooth(boothId);
                const isSelected = selectedBooth === boothId;

                return (
                  <div
                    key={boothId}
                    onClick={() => setSelectedBooth(isSelected ? null : boothId)}
                    style={{
                      ...s.booth,
                      background: isSelected ? '#fef3dc' : vendor ? '#e8f0e9' : 'var(--cream)',
                      borderColor: isSelected ? 'var(--amber)' : vendor ? 'var(--green-mid)' : 'var(--cream-dark)',
                      borderWidth: isSelected ? 2 : 1,
                    }}
                  >
                    <div style={s.boothId}>{boothId}</div>
                    {vendor ? (
                      <>
                        <div style={s.boothName}>{vendor.name.split(' ').slice(0, 2).join(' ')}</div>
                        <button
                          onClick={e => { e.stopPropagation(); clearBooth(boothId); }}
                          style={s.clearBtn}
                          title="Remove vendor"
                        >✕</button>
                      </>
                    ) : (
                      <div style={s.emptySlot}>+</div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      {/* Vendor assignment panel */}
      {selectedBooth && (
        <div style={s.assignPanel}>
          <div style={s.assignHeader}>
            Assign vendor to booth <strong>{selectedBooth}</strong>
            <button onClick={() => setSelectedBooth(null)} style={s.closeBtn}>✕</button>
          </div>
          <input
            type="text"
            placeholder="Search vendors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={s.searchInput}
            autoFocus
          />
          <div style={s.vendorList}>
            {filteredVendors.length === 0 ? (
              <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                {assignedSlugs.size === vendors.length ? 'All vendors assigned' : 'No vendors match'}
              </div>
            ) : filteredVendors.map(v => (
              <div
                key={v.slug}
                onClick={() => assignVendor(v.slug)}
                style={s.vendorItem}
              >
                <div style={{ fontWeight: 500, fontSize: 13 }}>{v.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.subcategory}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
        {Object.keys(value).length} of {BOOTHS.length} booths assigned
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 12 },
  legend: {
    display: 'flex', alignItems: 'center', gap: 16, fontSize: 12,
    color: 'var(--text-muted)',
  },
  legendDot: {
    display: 'inline-block', width: 14, height: 14,
    borderRadius: 3, marginRight: 4,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '32px repeat(6, 1fr)',
    gap: 4,
  },
  cornerCell: { width: 32 },
  colHeader: {
    textAlign: 'center', fontSize: 11,
    color: 'var(--text-muted)', fontWeight: 500,
    padding: '4px 0',
  },
  rowHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, color: 'var(--text-muted)', fontWeight: 500,
  },
  booth: {
    borderRadius: 6,
    border: '1px solid',
    padding: '6px',
    cursor: 'pointer',
    minHeight: 64,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'all 0.1s',
    overflow: 'hidden',
  },
  boothId: {
    fontSize: 10, color: 'var(--text-muted)',
    fontWeight: 600, letterSpacing: '0.5px',
    position: 'absolute', top: 4, left: 5,
  },
  boothName: {
    fontSize: 10, color: 'var(--green-deep)',
    fontWeight: 500, textAlign: 'center',
    lineHeight: 1.3, marginTop: 8,
  },
  emptySlot: {
    fontSize: 18, color: 'var(--cream-dark)',
    marginTop: 8,
  },
  clearBtn: {
    position: 'absolute', top: 2, right: 3,
    background: 'none', border: 'none',
    fontSize: 10, color: 'var(--text-muted)',
    cursor: 'pointer', padding: '1px 3px',
    borderRadius: 3,
    lineHeight: 1,
  },
  assignPanel: {
    background: 'var(--white)',
    border: '1px solid var(--amber)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  assignHeader: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    fontSize: 14, color: 'var(--text-primary)',
    background: '#fef3dc',
    borderBottom: '1px solid var(--cream-dark)',
  },
  closeBtn: {
    background: 'none', border: 'none',
    fontSize: 14, cursor: 'pointer',
    color: 'var(--text-muted)', padding: '0 4px',
  },
  searchInput: {
    width: '100%', padding: '10px 16px',
    border: 'none', borderBottom: '1px solid var(--cream-dark)',
    fontSize: 13, outline: 'none',
    fontFamily: 'DM Sans, sans-serif',
    background: 'var(--cream)',
    color: 'var(--text-primary)',
  },
  vendorList: {
    maxHeight: 200, overflowY: 'auto',
  },
  vendorItem: {
    padding: '10px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--cream-dark)',
    transition: 'background 0.1s',
  },
};
