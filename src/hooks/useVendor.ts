import { useEffect, useState } from 'react';
import Parse from '../lib/parse';
import { Vendor } from './useVendors';

function toSlugLike(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function tokenOverlapScore(left: string, right: string) {
  const leftTokens = new Set(left.split('-').filter(Boolean));
  const rightTokens = new Set(right.split('-').filter(Boolean));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let matches = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) matches += 1;
  });
  return matches / Math.max(leftTokens.size, rightTokens.size);
}

export function useVendor(identifier: string) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadVendor = async () => {
      setLoading(true);
      setError(null);
      setVendor(null);

      const raw = decodeURIComponent(identifier || '').trim();
      if (!raw) {
        setLoading(false);
        return;
      }

      try {
        // 1) Try direct slug lookup first.
        const bySlug = new Parse.Query('Vendor');
        bySlug.equalTo('slug', raw);
        let result: Parse.Object | undefined = (await bySlug.first()) ?? undefined;

        // 2) Try id lookup (legacy booth maps may store objectId).
        if (!result) {
          const byId = new Parse.Query('Vendor');
          try {
            result = (await byId.get(raw)) ?? undefined;
          } catch {
            result = undefined;
          }
        }

        // 3) Try normalized slug-like version.
        if (!result) {
          const normalized = toSlugLike(raw);
          if (normalized) {
            const byNormalizedSlug = new Parse.Query('Vendor');
            byNormalizedSlug.equalTo('slug', normalized);
            result = (await byNormalizedSlug.first()) ?? undefined;
          }
        }

        // 4) Last fallback: name match.
        if (!result) {
          const byName = new Parse.Query('Vendor');
          byName.equalTo('name', raw);
          result = (await byName.first()) ?? undefined;
        }

        // 5) Final fallback: scan vendors and match normalized name/slug.
        if (!result) {
          const allVendors = await new Parse.Query('Vendor').limit(500).find();
          const normalizedRaw = toSlugLike(raw);
          result = allVendors.find((vendor) => {
            const slug = String(vendor.get('slug') || '');
            const name = String(vendor.get('name') || '');
            return (
              slug === raw ||
              slug === normalizedRaw ||
              toSlugLike(name) === normalizedRaw
            );
          });

          // 6) Fuzzy fallback for near-match slugs (legacy typos in booth maps).
          if (!result && normalizedRaw) {
            let bestScore = 0;
            let bestVendor: Parse.Object | undefined;

            allVendors.forEach((vendor) => {
              const slug = toSlugLike(String(vendor.get('slug') || ''));
              const nameSlug = toSlugLike(String(vendor.get('name') || ''));
              const score = Math.max(
                tokenOverlapScore(normalizedRaw, slug),
                tokenOverlapScore(normalizedRaw, nameSlug)
              );

              if (score > bestScore) {
                bestScore = score;
                bestVendor = vendor;
              }
            });

            if (bestScore >= 0.75) {
              result = bestVendor;
            }
          }
        }

        if (cancelled) return;
        if (result) {
          setVendor({ objectId: result.id, ...result.attributes } as Vendor);
        } else {
          setError('Vendor not found');
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Vendor not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadVendor();
    return () => {
      cancelled = true;
    };
  }, [identifier]);

  return { vendor, loading, error };
}
