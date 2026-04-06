import { useEffect, useState } from 'react';
import Parse from '../lib/parse';
import { Vendor } from './useVendors';

export function useVendor(slug: string) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const query = new Parse.Query('Vendor');
    query.equalTo('slug', slug);

    query.first()
      .then(result => {
        if (result) setVendor({ objectId: result.id, ...result.attributes } as Vendor);
        else setError('Vendor not found');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  return { vendor, loading, error };
}
