import { useEffect, useState, useCallback } from "react";
import Parse from "../lib/parse";

export interface Vendor {
  objectId: string;
  name: string;
  slug: string;
  category: string;
  subcategory: string;
  description: string;
  location: string;
  website: string;
  isOrganic: boolean;
  tags: string[];
  boothNumber: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  averageRating: number;
  reviewCount: number;
  acceptsPreOrder: boolean;
  isActive: boolean;
  ownerId?: string;
}

export function useVendors(category?: string) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    const query = new Parse.Query("Vendor");
    // query.equalTo("isActive", true);
    query.limit(200);
    if (category) query.equalTo("category", category);
    query.ascending("name");
    query
      .find()
      .then((results) => {
        setVendors(
          results.map((r) => ({ objectId: r.id, ...r.attributes } as Vendor))
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [category]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  return { vendors, loading, error, refetch: fetchVendors };
}

export async function deleteVendorAndUser(vendorId: string, ownerId?: string) {
  // Delete the vendor record first. This is the admin action the UI depends on.
  const vendor = new Parse.Object("Vendor");
  vendor.set("objectId", vendorId);
  await vendor.destroy();

  // Best-effort cleanup only. Back4App commonly blocks browser clients from
  // deleting _User rows even when the vendor record can be removed.
  if (ownerId) {
    try {
      const user = Parse.User.createWithoutData(ownerId);
      await user.destroy();
    } catch (error: any) {
      console.warn("Vendor deleted, but linked user could not be deleted", error);
    }
  }
}
