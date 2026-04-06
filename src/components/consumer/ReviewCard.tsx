import React from 'react';
import { Review } from '../../hooks/useReviews';

interface Props {
  review: Review;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ color: '#f0a830', letterSpacing: 1 }}>
      {'★'.repeat(rating)}
      <span style={{ color: '#d8d0c4' }}>{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

export default function ReviewCard({ review }: Props) {
  const date = new Date(review.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const initials = review.authorName
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div style={s.card}>
      <div style={s.header}>
        <div style={s.avatar}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={s.author}>{review.authorName.split('@')[0]}</div>
          <div style={s.meta}>
            <Stars rating={review.rating} />
            <span style={s.date}>{date}</span>
          </div>
        </div>
      </div>

      <p style={s.body}>{review.body}</p>

      {review.photoUrl && (
        <img
          src={review.photoUrl}
          alt="Review"
          style={s.photo}
        />
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: {
    padding: '20px 0',
    borderBottom: '1px solid var(--cream-dark)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'var(--green-pale)',
    color: 'var(--green-mid)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
  },
  author: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-primary)',
    marginBottom: 2,
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 14,
  },
  date: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  body: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    lineHeight: 1.7,
    marginBottom: 12,
  },
  photo: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 8,
    objectFit: 'cover',
    maxHeight: 240,
    border: '1px solid var(--cream-dark)',
  },
};
