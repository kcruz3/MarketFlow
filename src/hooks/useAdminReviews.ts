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
      await Parse.Cloud.run('deleteReviewAsAdmin', { reviewId: objectId });
      setReviews(prev => prev.filter(r => r.objectId !== objectId));
    } catch (e: any) {
      if (e?.code === 119 || /Permission denied/i.test(e?.message || '')) {
        throw new Error(
          'Back4App is still denying review deletion. Make sure the deleteReviewAsAdmin Cloud Function has been deployed and that your admin account is in the admin or owner role.'
        );
      }
      throw e;
    }
  };

  return { reviews, loading, error, deleteReview, refetch: fetchReviews };
}
