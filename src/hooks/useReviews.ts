import { useEffect, useState } from 'react';
import Parse from '../lib/parse';

export interface Review {
  objectId: string;
  vendorSlug: string;
  authorName: string;
  authorId: string;
  rating: number;
  body: string;
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

    const Review = Parse.Object.extend('Review');
    const review = new Review();
    review.set('vendorSlug', vendorSlug);
    review.set('authorName', data.authorName);
    review.set('authorId', data.authorId);
    review.set('rating', data.rating);
    review.set('body', data.body);
    if (photoUrl) review.set('photoUrl', photoUrl);

    // Set ACL — author can edit, public can read
    const acl = new Parse.ACL();
    acl.setPublicReadAccess(true);
    acl.setWriteAccess(data.authorId, true);
    review.setACL(acl);

    await review.save();

    // Update vendor average rating
    const vendorQuery = new Parse.Query('Vendor');
    vendorQuery.equalTo('slug', vendorSlug);
    const vendor = await vendorQuery.first();
    if (vendor) {
      const allReviews = [...reviews, { rating: data.rating } as Review];
      const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      vendor.set('averageRating', Math.round(avg * 10) / 10);
      vendor.set('reviewCount', allReviews.length);
      await vendor.save();
    }

    await fetchReviews();
  };

  return { reviews, loading, error, submitReview, refetch: fetchReviews };
}
