import { useEffect, useState } from 'react';
import Parse from '../lib/parse';

export interface Review {
  objectId: string;
  vendorSlug: string;
  authorName: string;
  authorId: string;
  rating: number;
  body?: string;
  photoUrl?: string;
  createdAt: Date;
}

export function useReviews(vendorSlug: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const query = new Parse.Query('Review');
      query.equalTo('vendorSlug', vendorSlug);
      query.descending('createdAt');
      query.limit(50);
      const results = await query.find();
      setReviews(results.map(r => ({
        objectId: r.id!,
        vendorSlug: r.get('vendorSlug'),
        authorName: r.get('authorName'),
        authorId: r.get('authorId'),
        rating: r.get('rating'),
        body: r.get('body') || '',
        photoUrl: r.get('photoUrl'),
        createdAt: r.createdAt!,
      })));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, [vendorSlug]);

  const submitReview = async (data: {
    rating: number;
    body: string;
    photo?: File;
    authorName: string;
    authorId: string;
  }) => {
    let photoUrl: string | undefined;

    if (data.photo) {
      const parseFile = new Parse.File(data.photo.name, data.photo);
      await parseFile.save();
      photoUrl = parseFile.url();
    }

    await Parse.Cloud.run('createReviewForVendor', {
      vendorSlug,
      authorName: data.authorName,
      authorId: data.authorId,
      rating: data.rating,
      body: data.body,
      photoUrl,
    });

    await fetchReviews();
  };

  const deleteReview = async (objectId: string) => {
    await Parse.Cloud.run('deleteReviewAndRefresh', { reviewId: objectId });
    setReviews(prev => prev.filter(r => r.objectId !== objectId));
  };

  return { reviews, loading, error, submitReview, deleteReview, refetch: fetchReviews };
}
