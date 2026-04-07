import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import Parse from '../../lib/parse';
import { IconSave, IconCamera } from '../../components/Icons';

interface VendorProfile {
  objectId: string;
  name: string;
  description: string;
  location: string;
  website: string;
  tags: string[];
  logoUrl: string;
  bannerUrl: string;
  isOrganic: boolean;
  acceptsPreOrder: boolean;
}

export default function VendorProfilePage() {
  const { user } = useAuthContext();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Editable fields
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [tags, setTags] = useState('');
  const [acceptsPreOrder, setAcceptsPreOrder] = useState(false);

  useEffect(() => {
    if (!user?.vendorSlug) return;
    const q = new Parse.Query('Vendor');
    q.equalTo('slug', user.vendorSlug);
    q.first()
      .then(v => {
        if (!v) return;
        const p: VendorProfile = {
          objectId: v.id!,
          name: v.get('name'),
          description: v.get('description') || '',
          location: v.get('location') || '',
          website: v.get('website') || '',
          tags: v.get('tags') || [],
          logoUrl: v.get('logoUrl') || '',
          bannerUrl: v.get('bannerUrl') || '',
          isOrganic: v.get('isOrganic') || false,
          acceptsPreOrder: v.get('acceptsPreOrder') || false,
        };
        setProfile(p);
        setDescription(p.description);
        setLocation(p.location);
        setWebsite(p.website);
        setTags(p.tags.join(', '));
        setAcceptsPreOrder(p.acceptsPreOrder);
      })
      .finally(() => setLoading(false));
  }, [user?.vendorSlug]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError('');
    try {
      const q = new Parse.Query('Vendor');
      const obj = await q.get(profile.objectId);
      obj.set('description', description.trim());
      obj.set('location', location.trim());
      obj.set('website', website.trim());
      obj.set('tags', tags.split(',').map(t => t.trim()).filter(Boolean));
      obj.set('acceptsPreOrder', acceptsPreOrder);
      await obj.save();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-spinner">Loading your profile...</div>;

  if (!profile) return (
    <div className="empty-state">
      <h3>Profile not found</h3>
      <p>Your vendor profile hasn't been linked yet. Contact an admin.</p>
    </div>
  );

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">My Profile</div>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <IconSave size={15} />{saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      <div className="page-content">
        <div className="page-header">
          <h2>{profile.name}</h2>
          <p>Update how your business appears to customers</p>
        </div>

        {saved && (
          <div style={{ background: 'var(--sage-pale)', border: '1px solid var(--sage-light)', borderRadius: 10, padding: '12px 18px', fontSize: 13.5, color: 'var(--forest-mid)', marginBottom: 20, fontWeight: 600 }}>
            Profile saved successfully
          </div>
        )}

        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffcdd2', borderRadius: 10, padding: '12px 18px', fontSize: 13.5, color: '#c62828', marginBottom: 20 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
            {/* Main fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card">
                <div className="card-header"><h3>Business Info</h3></div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={f.field}>
                    <label style={f.label}>Business name</label>
                    <input value={profile.name} disabled style={{ ...f.input, opacity: 0.6, cursor: 'not-allowed' }} />
                    <span style={f.hint}>Name can only be changed by an admin</span>
                  </div>
                  <div style={f.field}>
                    <label style={f.label}>Description</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Tell customers what makes your products special..."
                      style={{ ...f.input, resize: 'vertical' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={f.field}>
                      <label style={f.label}>Location</label>
                      <input value={location} onChange={e => setLocation(e.target.value)}
                        placeholder="e.g. Skagit Valley, WA" style={f.input} />
                    </div>
                    <div style={f.field}>
                      <label style={f.label}>Website</label>
                      <input value={website} onChange={e => setWebsite(e.target.value)}
                        placeholder="https://..." style={f.input} />
                    </div>
                  </div>
                  <div style={f.field}>
                    <label style={f.label}>Tags <span style={f.hint}>(comma separated — help customers find you)</span></label>
                    <input value={tags} onChange={e => setTags(e.target.value)}
                      placeholder="e.g. berries, organic, seasonal, jam" style={f.input} />
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                <div className="card-header"><h3>Settings</h3></div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[
                    {
                      label: 'Accept pre-orders',
                      sub: 'Let customers order ahead for pickup',
                      val: acceptsPreOrder,
                      set: setAcceptsPreOrder,
                    },
                  ].map(({ label, sub, val, set }) => (
                    <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', cursor: 'pointer', borderBottom: '1px solid var(--cream-mid)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>
                      </div>
                      <div onClick={() => set(!val)} style={{ width: 40, height: 22, borderRadius: 11, background: val ? 'var(--forest-mid)' : 'var(--cream-dark)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
                        <div style={{ position: 'absolute', top: 2, left: val ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                      </div>
                    </label>
                  ))}
                  <div style={{ padding: '12px 0' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Organic</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{profile.isOrganic ? 'Marked as organic by admin' : 'Not marked as organic'}</div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><h3>Photos</h3></div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Logo</div>
                    {profile.logoUrl ? (
                      <img src={profile.logoUrl} alt="Logo" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--cream-dark)' }} />
                    ) : (
                      <div style={{ width: 80, height: 80, borderRadius: 8, border: '2px dashed var(--cream-dark)', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconCamera size={22} color="var(--text-muted)" />
                      </div>
                    )}
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>
                      Logo uploads coming soon. Contact admin to update.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const f: Record<string, React.CSSProperties> = {
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  hint: { fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 },
  input: { padding: '9px 12px', borderRadius: 8, border: '1px solid var(--cream-dark)', fontSize: 13.5, outline: 'none', fontFamily: 'Nunito, sans-serif', background: 'var(--cream)', color: 'var(--text-primary)', width: '100%' },
};
