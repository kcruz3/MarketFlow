import React from "react";
import { MarketEvent } from "../../hooks/useMarketEvents";
import { IconCalendar } from "../Icons";
import { formatEventDate } from "../../lib/marketEvents";

interface Props {
  events: MarketEvent[];
  onEdit?: (event: MarketEvent) => void;
  onStatusChange?: (event: MarketEvent, status: "draft" | "review" | "published") => void;
}

const STATUS_META = {
  draft: { label: "Draft", badgeClass: "badge-gray" },
  review: { label: "In Review", badgeClass: "badge-amber" },
  published: { label: "Published", badgeClass: "badge-green" },
} as const;

export default function EventList({ events, onEdit, onStatusChange }: Props) {
  if (events.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ marginBottom: 12 }}>
          <IconCalendar size={36} color="var(--text-muted)" />
        </div>
        <h3>No events yet</h3>
        <p>Create your first market event to get started</p>
      </div>
    );
  }

  return (
    <div>
      {events.map((event) => {
        const status = event.workflowStatus || (event.isPublished ? "published" : "draft");
        const statusMeta = STATUS_META[status];
        return (
          <div className="event-item" key={event.objectId}>
            <div className="event-date-block">
              <div className="event-date-day">
                {formatEventDate(event.date, { day: "numeric" })}
              </div>
              <div className="event-date-month">
                {formatEventDate(event.date, { month: "short" })}
              </div>
            </div>
            <div className="event-info" style={{ flex: 1 }}>
              <h4>{event.name}</h4>
              <p>
                {event.hours} &nbsp;·&nbsp; {event.address}
              </p>
              {event.notes && (
                <p
                  style={{
                    marginTop: 4,
                    fontStyle: "italic",
                    color: "var(--text-muted)",
                  }}
                >
                  {event.notes}
                </p>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className={`badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
              {onStatusChange && (
                <div style={{ display: "flex", gap: 6 }}>
                  {status !== "draft" && (
                    <button
                      onClick={() => onStatusChange(event, "draft")}
                      style={quickActionBtn}
                    >
                      Move to Draft
                    </button>
                  )}
                  {status !== "review" && (
                    <button
                      onClick={() => onStatusChange(event, "review")}
                      style={quickActionBtn}
                    >
                      Send to Review
                    </button>
                  )}
                  {status !== "published" && (
                    <button
                      onClick={() => onStatusChange(event, "published")}
                      style={{ ...quickActionBtn, borderColor: "var(--sage-light)" }}
                    >
                      Publish
                    </button>
                  )}
                </div>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(event)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--cream-dark)",
                    background: "var(--white)",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontFamily: "DM Sans, sans-serif",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.background =
                      "var(--green-pale)";
                    (e.target as HTMLButtonElement).style.borderColor =
                      "var(--green-mid)";
                    (e.target as HTMLButtonElement).style.color =
                      "var(--green-deep)";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background =
                      "var(--white)";
                    (e.target as HTMLButtonElement).style.borderColor =
                      "var(--cream-dark)";
                    (e.target as HTMLButtonElement).style.color =
                      "var(--text-secondary)";
                  }}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const quickActionBtn: React.CSSProperties = {
  padding: "5px 9px",
  borderRadius: 6,
  border: "1px solid var(--cream-dark)",
  background: "var(--white)",
  fontSize: 11.5,
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
};
