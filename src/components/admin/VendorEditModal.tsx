import React, { useState } from 'react';
import Parse from '../../lib/parse';
import { Vendor } from '../../hooks/useVendors';

interface Props {
  vendor: Vendor;
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIES = [
  'Farmers, Fishers, Foragers',
  'Food & Beverage Producers',
  'Prepared Food',
];

export default function VendorEditModal({ vendor, onClose, onSaved }: Props) {
  const [name, setName] = useState(vendor.name);
  const [description, setDescription] = useState(vendor.description || '');
  const [category, setCategory] = useState(vendor.category);
  const [subcategory, setSubcategory] = useState(vendor.subcategory || '');
  const [location, setLocation] = useState(vendor.location || '');
  const [website, setWebsite] = useState(vendor.website || '');
  const [isOrganic, setIsOrganic] = useState(vendor.isOrganic || false);
  const [acceptsPreOrder, setAcceptsPreOrder] = useState(vendor.acceptsPreOrder || false);
  const [isActive, setIsActive] = useState(vendor.isActive !== false);
  const [tags, setTags] = useState((vendor.tags || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const query = new Parse.Query('Vendor');
      const obj = await query.get(vendor.objectId);
      obj.set('name', name.trim());
      obj.set('description', description.trim());
      obj.set('category', category);
      obj.set('subcategory', subcategory.trim());
      obj.set('location', location.trim());
      obj.set('website', website.trim());
      obj.set('isOrganic', isOrganic);
      obj.set('acceptsPreOrder', acceptsPreOrder);
      obj.set('isActive', isActive);
      obj.set('tags', tags.split(',').map(t => t.trim()).filter(Boolean));
      await obj.save();
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Failed to save');
      setSaving(false);
    }
  };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.header}>
          <h2 style={s.title}>Edit Vendor</h2>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        <form onSubmit={handleSave} style={s.body}>
          {error && <div style={s.error}>{error}</div>}

          <div style={s.grid}>
            <div style={s.field}>
              <label style={s.label}>Business name *</label>
              <input value={name} onChange={e => setName(e.target.value)} style={s.input} required />
            </div>
            <div style={s.field}>
              <label style={s.label}>Category *</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={s.input}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Subcategory</label>
              <input value={subcategory} onChange={e => setSubcategory(e.target.value)}
                placeholder="e.g. Berries, Bakery..." style={s.input} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Location</label>
              <input value={location} onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Skagit Valley, WA" style={s.input} />
            </div>
            <div style={{ ...s.field, gridColumn: '1 / -1' }}>
              <label style={s.label}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={3} style={{ ...s.input, resize: 'vertical' }} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Website</label>
              <input value={website} onChange={e => setWebsite(e.target.value)}
                placeholder="https://..." style={s.input} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Tags <span style={s.hint}>(comma separated)</span></label>
              <input value={tags} onChange={e => setTags(e.target.value)}
                placeholder="organic, berries, seasonal" style={s.input} />
            </div>
          </div>

          {/* Toggles */}
          <div style={s.toggles}>
            {[
              { label: 'Organic', sub: 'Certified or practicing organic', val: isOrganic, set: setIsOrganic },
              { label: 'Accepts pre-orders', sub: 'Customers can order ahead for pickup', val: acceptsPreOrder, set: setAcceptsPreOrder },
              { label: 'Active', sub: 'Visible to customers on the platform', val: isActive, set: setIsActive },
            ].map(({ label, sub, val, set }) => (
              <label key={label} style={s.toggleRow}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>
                </div>
                <div
                  onClick={() => set(!val)}
                  style={{
                    width: 40, height: 22, borderRadius: 11,
                    background: val ? 'var(--forest-mid)' : 'var(--cream-dark)',
                    position: 'relative', cursor: 'pointer', flexShrink: 0,
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2,
                    left: val ? 20 : 2,
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'white', transition: 'left 0.2s',
                  }} />
                </div>
              </label>
            ))}
          </div>

          <div style={s.footer}>
            <button type="button" onClick={onClose} style={s.cancelBtn} disabled={saving}>Cancel</button>
            <button type="submit" style={s.saveBtn} disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(20,30,20,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal: { background: 'var(--white)', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 26px 16px', borderBottom: '1px solid var(--cream-mid)' },
  title: { fontFamily: 'Playfair Display, serif', fontSize: 20, color: 'var(--forest)' },
  closeBtn: { background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--text-muted)', padding: '4px 8px' },
  body: { flex: 1, overflowY: 'auto', padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 20 },
  error: { background: '#fff0f0', border: '1px solid #ffcdd2', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#c62828' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  hint: { fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 },
  input: { padding: '9px 12px', borderRadius: 8, border: '1px solid var(--cream-dark)', fontSize: 13.5, outline: 'none', fontFamily: 'Nunito, sans-serif', background: 'var(--cream)', color: 'var(--text-primary)' },
  toggles: { display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--cream-dark)', borderRadius: 10, overflow: 'hidden' },
  toggleRow: { display: 'flex', alignItems: 'center', gap: 16, padding: '13px 16px', cursor: 'pointer', borderBottom: '1px solid var(--cream-mid)', background: 'var(--white)' },
  footer: { display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 },
  cancelBtn: { padding: '9px 20px', borderRadius: 8, border: '1px solid var(--cream-dark)', background: 'var(--cream)', fontSize: 13.5, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Nunito, sans-serif' },
  saveBtn: { padding: '9px 22px', borderRadius: 8, border: 'none', background: 'var(--forest-mid)', color: 'white', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' },
};
