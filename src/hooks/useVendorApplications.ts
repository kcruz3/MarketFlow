import { useEffect, useState, useCallback } from 'react';
import Parse from '../lib/parse';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

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
  const Obj = Parse.Object.extend('VendorApplication');
  const obj = new Obj();
  Object.entries(data).forEach(([k, v]) => obj.set(k, v));
  obj.set('status', 'pending');
  obj.set('adminNotes', '');

  const acl = new Parse.ACL();
  acl.setReadAccess(data.userId, true);
  acl.setRoleReadAccess('admin', true);
  acl.setRoleWriteAccess('admin', true);
  obj.setACL(acl);

  await obj.save();
  return obj.id;
}

export function useVendorApplications() {
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApps = useCallback(async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const approve = async (appId: string, userId: string, businessName: string, adminNotes = '') => {
    // 1. Update application status
    const appQuery = new Parse.Query('VendorApplication');
    const app = await appQuery.get(appId);
    app.set('status', 'approved');
    app.set('adminNotes', adminNotes);
    await app.save();

    // 2. Add user to vendor role
    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo('name', 'vendor');
    const vendorRole = await roleQuery.first();
    if (vendorRole) {
      const userQuery = new Parse.Query(Parse.User);
      const user = await userQuery.get(userId);
      vendorRole.getUsers().add(user);
      await vendorRole.save();
    }

    // 3. Remove from customer role
    const custQuery = new Parse.Query(Parse.Role);
    custQuery.equalTo('name', 'customer');
    const custRole = await custQuery.first();
    if (custRole) {
      const userQuery = new Parse.Query(Parse.User);
      const user = await userQuery.get(userId);
      custRole.getUsers().remove(user);
      await custRole.save();
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

  return { applications, loading, approve, reject, refetch: fetchApps };
}
