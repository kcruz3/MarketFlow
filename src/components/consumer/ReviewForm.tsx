import React, { useState, useRef } from "react";
import { useAuthContext } from "../../context/AuthContext";

interface Props {
  onSubmit: (data: {
    rating: number;
    body: string;
    photo?: File;
    authorName: string;
    authorId: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function ReviewForm({ onSubmit, onCancel }: Props) {
  const { user } = useAuthContext();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be under 5MB");
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a star rating");
      return;
    }
    if (!user) {
      setError("You must be logged in to review");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await onSubmit({
        rating,
        body: body.trim(),
        photo: photo || undefined,
        authorName: user.displayName || user.email,
        authorId: user.objectId,
      });
    } catch (e: any) {
      setError(e.message || "Failed to submit review");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={s.form}>
      <h3 style={s.title}>Write a review</h3>

      {/* Star rating */}
      <div style={s.field}>
        <label style={s.label}>Rating</label>
        <div style={s.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              style={s.starBtn}
            >
              <span
                style={{
                  fontSize: 32,
                  color: star <= (hovered || rating) ? "#f0a830" : "#d8d0c4",
                  transition: "color 0.1s, transform 0.1s",
                  display: "inline-block",
                  transform:
                    star <= (hovered || rating) ? "scale(1.15)" : "scale(1)",
                }}
              >
                ★
              </span>
            </button>
          ))}
          {rating > 0 && (
            <span
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                marginLeft: 8,
              }}
            >
              {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
            </span>
          )}
        </div>
      </div>

      {/* Review text */}
      <div style={s.field}>
        <label style={s.label}>
          Your review{" "}
          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
            (optional)
          </span>
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share more details if you want to"
          rows={4}
          style={s.textarea}
        />
        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            textAlign: "right",
            marginTop: 4,
          }}
        >
          {body.length} characters
        </div>
      </div>

      {/* Photo upload */}
      <div style={s.field}>
        <label style={s.label}>
          Photo{" "}
          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
            (optional)
          </span>
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handlePhoto}
          style={{ display: "none" }}
        />
        {photoPreview ? (
          <div style={s.photoPreview}>
            <img src={photoPreview} alt="Preview" style={s.previewImg} />
            <button
              type="button"
              onClick={() => {
                setPhoto(null);
                setPhotoPreview(null);
              }}
              style={s.removePhoto}
            >
              ✕ Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            style={s.uploadBtn}
          >
            Add a photo
          </button>
        )}
      </div>

      {error && <div style={s.error}>{error}</div>}

      <div style={s.actions}>
        <button
          type="button"
          onClick={onCancel}
          style={s.cancelBtn}
          disabled={submitting}
        >
          Cancel
        </button>
        <button type="submit" style={s.submitBtn} disabled={submitting}>
          {submitting ? "Submitting..." : "Post review"}
        </button>
      </div>
    </form>
  );
}

const s: Record<string, React.CSSProperties> = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  title: {
    fontFamily: "Playfair Display, serif",
    fontSize: 20,
    color: "var(--forest)",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--text-primary)",
  },
  stars: {
    display: "flex",
    alignItems: "center",
    gap: 2,
  },
  starBtn: {
    background: "none",
    border: "none",
    padding: "2px 4px",
    cursor: "pointer",
    lineHeight: 1,
  },
  textarea: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid var(--cream-dark)",
    fontSize: 14,
    fontFamily: "DM Sans, sans-serif",
    color: "var(--text-primary)",
    background: "var(--cream)",
    resize: "vertical",
    outline: "none",
    lineHeight: 1.6,
  },
  uploadBtn: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "2px dashed var(--cream-dark)",
    background: "var(--cream)",
    color: "var(--text-secondary)",
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
    transition: "border-color 0.15s",
    alignSelf: "flex-start",
  },
  photoPreview: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  previewImg: {
    width: 80,
    height: 80,
    objectFit: "cover",
    borderRadius: 8,
    border: "1px solid var(--cream-dark)",
  },
  removePhoto: {
    background: "none",
    border: "1px solid var(--cream-dark)",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 12,
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
  },
  error: {
    background: "#fff0f0",
    border: "1px solid #ffcdd2",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: "#c62828",
  },
  actions: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
  },
  cancelBtn: {
    padding: "9px 20px",
    borderRadius: 8,
    border: "1px solid var(--cream-dark)",
    background: "var(--cream)",
    fontSize: 14,
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
  },
  submitBtn: {
    padding: "9px 20px",
    borderRadius: 8,
    border: "none",
    background: "var(--forest-mid)",
    color: "white",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
  },
};
