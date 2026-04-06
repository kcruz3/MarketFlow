import React from "react";
import { MarketEvent } from "../../hooks/useMarketEvents";
import { IconCalendar, IconEdit, IconClock, IconPin } from "../Icons";

interface Props {
  events: MarketEvent[];
  onEdit?: (event: MarketEvent) => void;
}

export default function EventList({ events, onEdit }: Props) {
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
        const date = new Date(event.date);
        return (
          <div className="event-item" key={event.objectId}>
            <div className="event-date-block">
              <div className="event-date-day">{date.getDate()}</div>
              <div className="event-date-month">
                {date.toLocaleString("default", { month: "short" })}
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
              <span
                className={`badge ${
                  event.isPublished ? "badge-green" : "badge-amber"
                }`}
              >
                {event.isPublished ? "Published" : "Draft"}
              </span>
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
