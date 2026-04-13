import { useEffect, useState } from 'react';
import Parse from '../lib/parse';
import { Review } from './useReviews';

export function useAdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const query = new Parse.Query('Review');
      query.descending('createdAt');
      query.limit(200);
      const results = await query.find();
      setReviews(results.map(r => ({
        objectId: r.id!,
        vendorSlug: r.get('vendorSlug'),
        authorName: r.get('authorName'),
        authorId: r.get('authorId'),
        rating: r.get('rating'),
        body: r.get('body'),
        photoUrl: r.get('photoUrl'),
        createdAt: r.createdAt!,
      })));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, []);

  const deleteReview = async (objectId: string) => {
    try {
      const query = new Parse.Query('Review');
      const review = await query.get(objectId);
      await review.destroy();
      setReviews(prev => prev.filter(r => r.objectId !== objectId));
    } catch (e: any) {
      if (e?.code === 119 || /Permission denied/i.test(e?.message || '')) {
        throw new Error(
          'This review was created without admin delete access. New reviews are fixed, but existing reviews need their Back4App ACLs updated before admins can remove them.'
        );
      }
      throw e;
    }
  };

  return { reviews, loading, error, deleteReview, refetch: fetchReviews };
}
