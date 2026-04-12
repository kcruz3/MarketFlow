import React, { useState } from "react";
import { useAdminReviews } from "../../hooks/useAdminReviews";
import { IconTrash, IconStar } from "../../components/Icons";

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ color: "#f0a830", letterSpacing: 1 }}>
      {"★".repeat(rating)}
      <span style={{ color: "#d8d0c4" }}>{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export default function AdminReviewsPage() {
  const { reviews, loading, error, deleteReview } = useAdminReviews();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleRemove = async (objectId: string) => {
    setRemovingId(objectId);
    try {
      await deleteReview(objectId);
    } finally {
      setRemovingId(null);
      setConfirmId(null);
    }
  };

  // Group reviews by vendor slug for easier scanning
  const byVendor = reviews.reduce<Record<string, typeof reviews>>((acc, r) => {
    if (!acc[r.vendorSlug]) acc[r.vendorSlug] = [];
    acc[r.vendorSlug].push(r);
    return acc;
  }, {});

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Review Moderation</div>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {reviews.length} review{reviews.length !== 1 ? "s" : ""} total
        </span>
      </div>

      <div className="page-content">
        <div className="page-header">
          <h2>Customer Reviews</h2>
          <p>Remove reviews that violate community guidelines</p>
        </div>

        {loading ? (
          <div className="loading-spinner">Loading reviews...</div>
        ) : error ? (
          <div className="empty-state">
            <h3>Could not load reviews</h3>
            <p>{error}</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="empty-state">
            <div style={{ marginBottom: 12 }}>
              <IconStar size={36} color="var(--text-muted)" />
            </div>
            <h3>No reviews yet</h3>
            <p>Customer reviews will appear here once submitted</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {Object.entries(byVendor).map(([vendorSlug, vendorReviews]) => (
              <div className="card" key={vendorSlug}>
                <div className="card-header">
                  <h3 style={{ fontFamily: "Playfair Display, serif" }}>
                    {vendorSlug}
                  </h3>
                  <span className="badge badge-gray">
                    {vendorReviews.length} review{vendorReviews.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Author</th>
                        <th>Rating</th>
                        <th>Review</th>
                        <th>Date</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorReviews.map((review) => (
                        <tr key={review.objectId}>
                          <td style={{ fontWeight: 500, whiteSpace: "nowrap" }}>
                            {review.authorName.split("@")[0]}
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <Stars rating={review.rating} />
                          </td>
                          <td style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 400 }}>
                            {review.body}
                          </td>
                          <td style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                            {new Date(review.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td>
                            {confirmId === review.objectId ? (
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <button
                                  className="btn"
                                  style={{ fontSize: 12, padding: "4px 10px", background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 6, cursor: "pointer" }}
                                  onClick={() => handleRemove(review.objectId)}
                                  disabled={removingId === review.objectId}
                                >
                                  {removingId === review.objectId ? "Removing..." : "Confirm"}
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ fontSize: 12, padding: "4px 10px" }}
                                  onClick={() => setConfirmId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmId(review.objectId)}
                                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px", borderRadius: 6, display: "flex", alignItems: "center" }}
                                title="Remove review"
                              >
                                <IconTrash size={15} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
