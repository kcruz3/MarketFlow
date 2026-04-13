import { useEffect, useState, useCallback } from 'react';
import Parse from '../lib/parse';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

function createVendorSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export interface VendorApplication {
  objectId: string;
  userId: string;
  userEmail: string;
  businessName: string;
  category: string;
  description: string;
  location: string;
  website: string;
  status: ApplicationStatus;
  adminNotes: string;
  createdAt: Date;
}

export async function submitApplication(data: {
  userId: string;
  userEmail: string;
  businessName: string;
  category: string;
  description: string;
  location: string;
  website: string;
}) {
  const obj = new Parse.Object('VendorApplication');

obj.set('userId', data.userId);
obj.set('userEmail', data.userEmail);
obj.set('businessName', data.businessName);
obj.set('category', data.category);
obj.set('description', data.description);

if (data.location) obj.set('location', data.location);
if (data.website) obj.set('website', data.website);

obj.set('status', 'pending');
obj.set('adminNotes', '');

await obj.save();
}

export function useVendorApplications() {
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new Parse.Query('VendorApplication');
      query.descending('createdAt');
      query.limit(100);
      const results = await query.find();
      setApplications(results.map(r => ({
        objectId: r.id,
        ...r.attributes,
        createdAt: r.createdAt,
      } as VendorApplication)));
    } catch (e: any) {
      setError(e.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const approve = async (
  appId: string,
  userId: string,
  businessName: string,
  adminNotes = ''
) => {
  // 1. Update application status
  const appQuery = new Parse.Query('VendorApplication');
  const app = await appQuery.get(appId);
  app.set('status', 'approved');
  app.set('adminNotes', adminNotes);
  await app.save();

  // 2. Create slug
  const slug = createVendorSlug(businessName);

  // 3. Create vendor row only if one does not already exist
  const vendorQuery = new Parse.Query('Vendor');
  vendorQuery.equalTo('ownerId', userId);
  let vendor = await vendorQuery.first();

  if (!vendor) {
    const slugQuery = new Parse.Query('Vendor');
    slugQuery.equalTo('slug', slug);
    vendor = await slugQuery.first();
  }

  if (!vendor) {
    vendor = new Parse.Object('Vendor');
    vendor.set('name', businessName);
    vendor.set('slug', slug);
    vendor.set('ownerId', userId);

    // optional starter fields
    vendor.set('description', app.get('description') || '');
    vendor.set('location', app.get('location') || '');
    vendor.set('website', app.get('website') || '');
    vendor.set('category', app.get('category') || '');
    vendor.set('isOrganic', false);
    vendor.set('acceptsPreOrder', true);
    vendor.set('tags', []);

    await vendor.save();
  } else {
    vendor.set('ownerId', userId);
    if (!vendor.get('slug')) vendor.set('slug', slug);
    if (!vendor.get('name')) vendor.set('name', businessName);
    await vendor.save();
  }

  // 4. Update user with vendorSlug
  let user = Parse.User.createWithoutData(userId);
  try {
    const userQuery = new Parse.Query(Parse.User);
    user = await userQuery.get(userId);
    user.set('vendorSlug', vendor.get('slug') || slug);
    await user.save();
  } catch (error) {
    console.warn('Unable to persist vendorSlug on user during approval', error);
  }

  // 5. Best-effort role maintenance. Back4App often blocks Role writes from
  // browser clients, so approval should still succeed without these updates.
  try {
    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo('name', 'vendor');
    const vendorRole = await roleQuery.first();
    if (vendorRole) {
      vendorRole.getUsers().add(user);
      await vendorRole.save();
    }
  } catch (error) {
    console.warn('Unable to add approved user to vendor role', error);
  }

  try {
    const custQuery = new Parse.Query(Parse.Role);
    custQuery.equalTo('name', 'customer');
    const custRole = await custQuery.first();
    if (custRole) {
      custRole.getUsers().remove(user);
      await custRole.save();
    }
  } catch (error) {
    console.warn('Unable to remove approved user from customer role', error);
  }

  await fetchApps();
};

  const reject = async (appId: string, adminNotes = '') => {
    const appQuery = new Parse.Query('VendorApplication');
    const app = await appQuery.get(appId);
    app.set('status', 'rejected');
    app.set('adminNotes', adminNotes);
    await app.save();
    await fetchApps();
  };

  return { applications, loading, error, approve, reject, refetch: fetchApps };
}
