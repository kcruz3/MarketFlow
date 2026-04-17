import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useVendor } from "../../hooks/useVendor";
import { useReviews } from "../../hooks/useReviews";
import { useMenuItems } from "../../hooks/useMenuItems";
import { useAuthContext } from "../../context/AuthContext";
import ReviewForm from "../../components/consumer/ReviewForm";
import ReviewCard from "../../components/consumer/ReviewCard";
import CheckoutModal from "../../components/consumer/CheckoutModal";
import {
  IconArrowLeft,
  IconExternalLink,
  IconZap,
  IconStar,
  IconLeaf,
  IconJar,
  IconUtensilsCrossed,
  IconPin,
  IconShoppingCart,
  IconCheck,
  IconLoader,
} from "../../components/Icons";

export default function VendorPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { vendor, loading, error } = useVendor(slug || "");
  const { reviews, loading: rLoading, submitReview, deleteReview } = useReviews(slug || "");
  const { items, loading: mLoading } = useMenuItems(slug || "");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [itemFilter, setItemFilter] = useState<"all" | "available" | "out-of-stock">("all");
  const [orderConfirmation, setOrderConfirmation] = useState<string | null>(
    null
  );

  const handleSubmitReview = async (data: any) => {
    await submitReview(data);
    setShowReviewForm(false);
    setReviewSuccess(true);
    setTimeout(() => setReviewSuccess(false), 4000);
  };

  const handleOrderPlaced = (qrCode: string) => {
    setShowCheckout(false);
    setOrderConfirmation(qrCode);
  };

  if (loading)
    return (
      <div className="loading-spinner" style={{ minHeight: "60vh" }}>
        Loading vendor...
      </div>
    );
  if (error || !vendor)
    return (
      <div className="empty-state">
        <h3>Vendor not found</h3>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/vendors")}
          style={{ marginTop: 16 }}
        >
          Back to vendors
        </button>
      </div>
    );

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  const availableItems = items.filter((i) => i.available);
  const normalizedItemSearch = itemSearch.trim().toLowerCase();
  const itemCategories = Array.from(
    new Set(items.map((item) => item.category).filter(Boolean))
  );
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !normalizedItemSearch ||
      item.name.toLowerCase().includes(normalizedItemSearch) ||
      item.description?.toLowerCase().includes(normalizedItemSearch) ||
      item.category?.toLowerCase().includes(normalizedItemSearch);

    const matchesFilter =
      itemFilter === "all" ||
      (itemFilter === "available" && item.available) ||
      (itemFilter === "out-of-stock" && !item.available);

    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      <div className="topbar">
        <button
          className="btn btn-secondary"
          onClick={() => navigate(-1)}
        ></button>
        <div style={{ display: "flex", gap: 10 }}>
          {user && vendor.acceptsPreOrder && availableItems.length > 0 && (
            <button
              className="btn btn-amber"
              onClick={() => setShowCheckout(true)}
            >
              Pre-order for pickup
            </button>
          )}
          {vendor.website && (
            <a
              href={vendor.website}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
            >
              Visit Website
            </a>
          )}
        </div>
      </div>

      <div className="page-content">
        {/* Order confirmation banner */}
        {orderConfirmation && (
          <div
            style={{
              background: "var(--forest)",
              color: "white",
              borderRadius: 12,
              padding: "20px 24px",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "Playfair Display, serif",
                  fontSize: 18,
                  marginBottom: 4,
                }}
              >
                Order placed!
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                Show this code at the booth when you pick up
              </div>
            </div>
            <div
              style={{
                textAlign: "center",
                background: "rgba(255,255,255,0.1)",
                borderRadius: 10,
                padding: "12px 20px",
              }}
            >
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--wheat-light)",
                  letterSpacing: 2,
                }}
              >
                {orderConfirmation}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.5)",
                  marginTop: 2,
                }}
              >
                Order code
              </div>
            </div>
            <button
              onClick={() => setOrderConfirmation(null)}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                fontSize: 20,
              }}
            >
              ✕
            </button>
          </div>
        )}

        <div className="vendor-detail-hero">
          <span style={{ fontSize: 72, position: "relative", zIndex: 1 }}>
            {vendor.category === "Farmers, Fishers, Foragers"
              ? ""
              : vendor.category === "Food & Beverage Producers"
              ? ""
              : ""}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 300px",
            gap: 28,
            alignItems: "start",
          }}
        >
          <div>
            <h2 className="vendor-detail-name">{vendor.name}</h2>
            <div style={{ color: "var(--text-secondary)", marginBottom: 12 }}>
              {vendor.subcategory || vendor.category} &nbsp;·&nbsp;{" "}
              {vendor.location}
            </div>
            <div className="vendor-detail-tags">
              {vendor.isOrganic && (
                <span className="badge badge-green">Organic</span>
              )}
              {vendor.acceptsPreOrder && (
                <span className="badge badge-amber">Accepts Pre-orders</span>
              )}
              {vendor.tags?.map((tag) => (
                <span key={tag} className="badge badge-gray">
                  {tag}
                </span>
              ))}
            </div>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.7,
                color: "var(--text-secondary)",
                marginTop: 16,
              }}
            >
              {vendor.description}
            </p>

            {/* Menu */}
            <div className="card" style={{ marginTop: 28 }}>
              <div className="card-header">
                <h3>Menu & Products</h3>
                {user &&
                  vendor.acceptsPreOrder &&
                  availableItems.length > 0 && (
                    <button
                      className="btn btn-amber"
                      onClick={() => setShowCheckout(true)}
                      style={{ fontSize: 13, padding: "7px 16px" }}
                    >
                      Pre-order
                    </button>
                  )}
              </div>
              <div className="card-body">
                {mLoading ? (
                  <div className="loading-spinner" style={{ padding: 20 }}>
                    Loading menu...
                  </div>
                ) : items.length === 0 ? (
                  <div className="empty-state" style={{ padding: "24px 0" }}>
                    <h3>No items listed yet</h3>
                    <p>This vendor hasn't added their menu yet</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Search products, descriptions, or categories..."
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        style={{
                          flex: 1,
                          minWidth: 240,
                          padding: "10px 14px",
                          borderRadius: 999,
                          border: "1px solid var(--cream-dark)",
                          background: "var(--cream)",
                          fontSize: 14,
                          fontFamily: "DM Sans, sans-serif",
                          outline: "none",
                        }}
                      />
                      <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                        {filteredItems.length} result{filteredItems.length !== 1 ? "s" : ""}
                      </div>
                    </div>

                    <div className="filter-bar" style={{ margin: 0 }}>
                      {(["all", "available", "out-of-stock"] as const).map((filter) => (
                        <button
                          key={filter}
                          className={`filter-chip ${itemFilter === filter ? "active" : ""}`}
                          onClick={() => setItemFilter(filter)}
                          style={{ textTransform: "capitalize" }}
                        >
                          {filter === "out-of-stock" ? "Out of stock" : filter}
                        </button>
                      ))}
                      {itemCategories.map((category) => (
                        <span
                          key={category}
                          className="badge badge-gray"
                          style={{ alignSelf: "center" }}
                        >
                          {category}
                        </span>
                      ))}
                    </div>

                    {filteredItems.length === 0 ? (
                      <div className="empty-state" style={{ padding: "28px 0" }}>
                        <h3>No matching items</h3>
                        <p>Try a different search or switch your availability filter</p>
                      </div>
                    ) : (
                      <div
                        style={{ display: "flex", flexDirection: "column", gap: 0 }}
                      >
                        {filteredItems.map((item, i) => (
                          <div
                            key={item.objectId}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "12px 0",
                              borderBottom:
                                i < filteredItems.length - 1
                                  ? "1px solid var(--cream-dark)"
                                  : "none",
                              opacity: item.available ? 1 : 0.5,
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  flexWrap: "wrap",
                                  marginBottom: item.description ? 3 : 0,
                                }}
                              >
                                <div style={{ fontWeight: 500, fontSize: 14 }}>
                                  {item.name}
                                </div>
                                {item.category && (
                                  <span className="badge badge-gray">{item.category}</span>
                                )}
                              </div>
                              {item.description && (
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  {item.description}
                                </div>
                              )}
                              {!item.available && (
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  Out of stock
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                fontWeight: 500,
                                fontSize: 15,
                                color: "var(--forest)",
                                marginLeft: 16,
                                flexShrink: 0,
                              }}
                            >
                              ${item.price.toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Reviews */}
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-header">
                <h3>
                  Reviews{" "}
                  {avgRating && (
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 400,
                        color: "var(--text-secondary)",
                        marginLeft: 10,
                      }}
                    >
                      ★ {avgRating} · {reviews.length}
                    </span>
                  )}
                </h3>
                {!showReviewForm && user && (
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowReviewForm(true)}
                    style={{ fontSize: 13, padding: "7px 16px" }}
                  >
                    + Write a review
                  </button>
                )}
              </div>
              <div className="card-body">
                {reviewSuccess && (
                  <div
                    style={{
                      background: "var(--sage-pale)",
                      border: "1px solid var(--forest-light)",
                      borderRadius: 8,
                      padding: "12px 16px",
                      fontSize: 14,
                      color: "var(--forest)",
                      marginBottom: 20,
                    }}
                  >
                    Your review was posted!
                  </div>
                )}
                {showReviewForm && (
                  <div
                    style={{
                      background: "var(--cream)",
                      borderRadius: 10,
                      padding: 24,
                      marginBottom: 24,
                      border: "1px solid var(--cream-dark)",
                    }}
                  >
                    <ReviewForm
                      onSubmit={handleSubmitReview}
                      onCancel={() => setShowReviewForm(false)}
                    />
                  </div>
                )}
                {rLoading ? (
                  <div className="loading-spinner" style={{ padding: 24 }}>
                    Loading...
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="empty-state" style={{ padding: "32px 0" }}>
                    <h3>No reviews yet</h3>
                    <p>Be the first to share your experience</p>
                    {!showReviewForm && user && (
                      <button
                        className="btn btn-primary"
                        onClick={() => setShowReviewForm(true)}
                        style={{ marginTop: 16 }}
                      >
                        Write the first review
                      </button>
                    )}
                  </div>
                ) : (
                  reviews.map((review) => (
                    <ReviewCard
                      key={review.objectId}
                      review={review}
                      onDelete={user?.objectId === review.authorId ? () => deleteReview(review.objectId) : undefined}
                    />
                  ))
                )}
                {!user && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "16px 0 0",
                      borderTop: "1px solid var(--cream-dark)",
                      marginTop: 16,
                    }}
                  >
                    <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
                      <a
                        href="/login"
                        style={{ color: "var(--forest-mid)", fontWeight: 500 }}
                      >
                        Sign in
                      </a>{" "}
                      to leave a review
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right info card */}
          <div>
            <div className="card">
              <div className="card-body">
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.8px",
                      marginBottom: 6,
                    }}
                  >
                    Rating
                  </div>
                  {avgRating ? (
                    <>
                      <div
                        style={{
                          fontFamily: "Playfair Display, serif",
                          fontSize: 36,
                          color: "var(--forest)",
                          lineHeight: 1,
                        }}
                      >
                        {avgRating}
                        <span
                          style={{
                            fontSize: 20,
                            color: "#f0a830",
                            marginLeft: 6,
                          }}
                        >
                          ★
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          marginTop: 4,
                        }}
                      >
                        {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
                      No reviews yet
                    </div>
                  )}
                </div>
                {vendor.boothNumber && (
                  <div
                    style={{
                      marginBottom: 20,
                      paddingTop: 16,
                      borderTop: "1px solid var(--cream-dark)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.8px",
                        marginBottom: 6,
                      }}
                    >
                      Booth
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        fontFamily: "Playfair Display, serif",
                        color: "var(--forest)",
                      }}
                    >
                      #{vendor.boothNumber}
                    </div>
                  </div>
                )}
                {user &&
                  vendor.acceptsPreOrder &&
                  availableItems.length > 0 && (
                    <button
                      onClick={() => setShowCheckout(true)}
                      className="btn btn-amber"
                      style={{
                        width: "100%",
                        justifyContent: "center",
                        display: "flex",
                        marginBottom: 10,
                      }}
                    >
                      Pre-order for pickup
                    </button>
                  )}
                {vendor.website && (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      display: "flex",
                    }}
                  >
                    Visit Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCheckout && (
        <CheckoutModal
          vendorSlug={vendor.slug}
          vendorName={vendor.name}
          items={items}
          onClose={() => setShowCheckout(false)}
          onOrderPlaced={handleOrderPlaced}
        />
      )}
    </div>
  );
}
