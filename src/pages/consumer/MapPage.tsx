import { IconMap } from "../../components/Icons";
import React, { useState } from "react";
import { useMarketEvents } from "../../hooks/useMarketEvents";
import MarketMap, { BoothPosition } from "../../components/consumer/MarketMap";
import {
  isUpcomingDate,
  splitEventsByDate,
  sortEventsByDateAsc,
} from "../../lib/marketEvents";

function normalizeVendorKey(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function MapPage() {
  const { events, loading: eLoading } = useMarketEvents();
  const vendorsFromEvents = events.flatMap((event) => event.boothMap ?? []);
  const vendorSlugToSlug = new Map(
    vendorsFromEvents
      .filter((booth) => booth.vendorSlug)
      .map((booth) => [booth.vendorSlug, booth.vendorSlug])
  );
  const vendorsById = new Map(
    vendorsFromEvents
      .filter((booth) => booth.vendorId && booth.vendorSlug)
      .map((booth) => [booth.vendorId!, booth.vendorSlug])
  );
  const vendorsByNormalizedName = new Map(
    vendorsFromEvents
      .filter((booth) => booth.vendorName && booth.vendorSlug)
      .map((booth) => [normalizeVendorKey(booth.vendorName), booth.vendorSlug])
  );
  const [mapTab, setMapTab] = useState<"map" | "events">("map");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const publishedEvents = sortEventsByDateAsc(
    events.filter((event) => event.isPublished && isUpcomingDate(event.date))
  );
  const allPublishedEvents = sortEventsByDateAsc(
    events.filter((event) => event.isPublished)
  );
  const publishedByDate = splitEventsByDate(allPublishedEvents);
  const pastPublishedEvents = [...publishedByDate.past].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const nextEvent = publishedEvents[0] ?? null;
  const selectedEvent =
    publishedEvents.find((event) => event.objectId === selectedEventId) ??
    nextEvent;

  // Resolve stale booth links from legacy map data to current vendor slugs.
  const booths: BoothPosition[] = (selectedEvent?.boothMap ?? []).map((booth) => {
    const currentSlug = (booth.vendorSlug || "").trim();
    if (currentSlug && vendorSlugToSlug.has(currentSlug)) {
      return booth;
    }

    const fallbackById = booth.vendorId ? vendorsById.get(booth.vendorId) : undefined;
    const fallbackByName = booth.vendorName
      ? vendorsByNormalizedName.get(normalizeVendorKey(booth.vendorName))
      : undefined;

    const resolvedSlug = fallbackById || fallbackByName || currentSlug;
    return { ...booth, vendorSlug: resolvedSlug };
  });

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Market Map</div>
      </div>

      <div className="page-content">
        {/* Next event hero banner */}
        {!eLoading && selectedEvent && (
          <div style={s.heroBanner}>
            <div style={s.heroBannerLeft}>
              <div style={s.heroBannerLabel}>
                {selectedEvent.objectId === nextEvent?.objectId
                  ? "Next market day"
                  : "Selected market day"}
              </div>
              <div style={s.heroBannerName}>{selectedEvent.name}</div>
              <div style={s.heroBannerDetails}>
                <span>{selectedEvent.hours}</span>
                <span style={{ margin: "0 8px", opacity: 0.4 }}>·</span>
                <span>{selectedEvent.address}</span>
              </div>
            </div>
            <div style={s.heroBannerDate}>
              <div style={s.heroBannerDay}>
                {new Date(selectedEvent.date).getDate()}
              </div>
              <div style={s.heroBannerMonth}>
                {new Date(selectedEvent.date).toLocaleString("default", {
                  month: "long",
                })}
              </div>
            </div>
          </div>
        )}

        {/* Upcoming events list */}
        {!eLoading && publishedEvents.length > 1 && (
          <div style={s.eventsSection}>
            <div style={s.eventsHeader}>
              <h3 style={s.eventsTitle}>All Upcoming Market Days</h3>
            </div>
            <div style={s.eventCards}>
              {publishedEvents.map((event, i) => {
                const date = new Date(event.date);
                return (
                  <div
                    key={event.objectId}
                    onClick={() => setSelectedEventId(event.objectId)}
                    style={{
                      ...s.eventCard,
                      cursor: "pointer",
                      border:
                        event.objectId === selectedEvent?.objectId
                          ? "2px solid var(--forest-mid)"
                          : "1px solid var(--cream-dark)",
                    }}
                  >
                    {event.objectId === nextEvent?.objectId && (
                      <div style={s.nextBadge}>Next market</div>
                    )}
                    <div style={s.eventCardDate}>
                      <div style={s.eventDay}>{date.getDate()}</div>
                      <div style={s.eventMonth}>
                        {date
                          .toLocaleString("default", { month: "short" })
                          .toUpperCase()}
                      </div>
                      <div style={s.eventYear}>{date.getFullYear()}</div>
                    </div>
                    <div style={s.eventCardInfo}>
                      <div style={s.eventName}>{event.name}</div>
                      <div style={s.eventMeta}>{event.hours}</div>
                      {event.notes && (
                        <div style={{ ...s.eventMeta, fontStyle: "italic" }}>
                          {event.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 0,
            marginBottom: 20,
            borderBottom: "1px solid var(--cream-dark)",
          }}
        >
          {(["map", "events"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setMapTab(t)}
              style={{
                padding: "10px 24px",
                borderRadius: "8px 8px 0 0",
                border: "none",
                borderBottom:
                  mapTab === t
                    ? "2px solid var(--forest-mid)"
                    : "2px solid transparent",
                background: mapTab === t ? "var(--white)" : "transparent",
                color: mapTab === t ? "var(--forest)" : "var(--text-muted)",
                fontWeight: mapTab === t ? 500 : 400,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
                marginBottom: -1,
                textTransform: "capitalize",
              }}
            >
              {t === "map"
                ? "Market Map"
                : "All Events"}
            </button>
          ))}
        </div>

        {/* MAP TAB */}
        {mapTab === "map" && (
          <div>
            {selectedEvent ? (
              booths.length > 0 ? (
                <>
                  <div style={s.mapContext}>
                    Showing booth map for{" "}
                    <strong style={{ color: "var(--forest)" }}>
                      {selectedEvent.name}
                    </strong>
                  </div>
                  <MarketMap booths={booths} />
                </>
              ) : (
                <div className="map-container">
                  <div className="map-icon">
                    <IconMap size={48} color="var(--forest-mid)" />
                  </div>
                  <div
                    style={{
                      fontFamily: "Playfair Display, serif",
                      fontSize: 18,
                      color: "var(--forest)",
                    }}
                  >
                    Booth layout not published yet
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    The admin hasn't assigned booths for {selectedEvent.name} yet
                  </div>
                </div>
              )
            ) : (
              <div className="map-container">
                <div className="map-icon">
                  <IconMap size={48} color="var(--forest-mid)" />
                </div>
                <div
                  style={{
                    fontFamily: "Playfair Display, serif",
                    fontSize: 18,
                    color: "var(--forest)",
                  }}
                >
                  No upcoming market days
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Check back soon for the next market schedule
                </div>
              </div>
            )}
          </div>
        )}

        {mapTab === "events" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div className="card">
              <div className="card-header">
                <h3>Upcoming Events</h3>
                <span className="badge badge-green">
                  {publishedByDate.upcoming.length} upcoming
                </span>
              </div>
              <div className="card-body">
                {publishedByDate.upcoming.length === 0 ? (
                  <div className="empty-state" style={{ padding: "28px 16px" }}>
                    <h3>No upcoming events</h3>
                    <p>Check back for the next published market day.</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {publishedByDate.upcoming.map((event) => (
                      <button
                        key={event.objectId}
                        onClick={() => {
                          setSelectedEventId(event.objectId);
                          setMapTab("map");
                        }}
                        style={{
                          ...s.allEventsRow,
                          borderColor:
                            event.objectId === selectedEvent?.objectId
                              ? "var(--forest-mid)"
                              : "var(--cream-dark)",
                        }}
                      >
                        <div style={s.allEventsDate}>
                          {new Date(event.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div style={s.allEventsInfo}>
                          <div style={s.allEventsName}>{event.name}</div>
                          <div style={s.allEventsMeta}>
                            {event.hours} · {event.address}
                          </div>
                        </div>
                        <span className="badge badge-amber">View on map</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {pastPublishedEvents.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3>Past Events</h3>
                  <span className="badge badge-gray">{pastPublishedEvents.length} past</span>
                </div>
                <div className="card-body">
                  <div style={{ display: "grid", gap: 10 }}>
                    {pastPublishedEvents.map((event) => (
                      <div key={event.objectId} style={s.pastEventsRow}>
                        <div style={s.allEventsDate}>
                          {new Date(event.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div style={s.allEventsInfo}>
                          <div style={s.allEventsName}>{event.name}</div>
                          <div style={s.allEventsMeta}>
                            {event.hours} · {event.address}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  heroBanner: {
    background: "var(--forest)",
    borderRadius: 12,
    padding: "20px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    color: "white",
  },
  heroBannerLeft: { flex: 1 },
  heroBannerLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "1.2px",
    color: "var(--wheat-light)",
    marginBottom: 6,
  },
  heroBannerName: {
    fontFamily: "Playfair Display, serif",
    fontSize: 22,
    marginBottom: 8,
  },
  heroBannerDetails: { fontSize: 13, color: "rgba(255,255,255,0.7)" },
  heroBannerDate: {
    textAlign: "center",
    background: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: "12px 20px",
    marginLeft: 20,
    flexShrink: 0,
  },
  heroBannerDay: {
    fontFamily: "Playfair Display, serif",
    fontSize: 40,
    lineHeight: 1,
    color: "var(--wheat-light)",
  },
  heroBannerMonth: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  eventsSection: { marginBottom: 24 },
  eventsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  eventsTitle: {
    fontFamily: "Playfair Display, serif",
    fontSize: 18,
    color: "var(--forest)",
  },
  eventCards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 12,
  },
  eventCard: {
    background: "var(--white)",
    borderRadius: 10,
    padding: 16,
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
    position: "relative",
    overflow: "hidden",
  },
  nextBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    background: "var(--forest-mid)",
    color: "white",
    fontSize: 10,
    fontWeight: 600,
    padding: "3px 10px",
    borderBottomLeftRadius: 8,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  },
  eventCardDate: {
    background: "var(--sage-pale)",
    borderRadius: 8,
    padding: "8px 12px",
    textAlign: "center",
    flexShrink: 0,
    minWidth: 52,
  },
  eventDay: {
    fontFamily: "Playfair Display, serif",
    fontSize: 26,
    color: "var(--forest)",
    lineHeight: 1,
  },
  eventMonth: {
    fontSize: 10,
    fontWeight: 600,
    color: "var(--forest-mid)",
    letterSpacing: "0.8px",
    marginTop: 2,
  },
  eventYear: { fontSize: 10, color: "var(--text-muted)", marginTop: 1 },
  eventCardInfo: { flex: 1, paddingTop: 2 },
  eventName: {
    fontWeight: 500,
    fontSize: 14,
    color: "var(--text-primary)",
    marginBottom: 5,
  },
  eventMeta: { fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 },
  mapContext: {
    marginBottom: 10,
    fontSize: 13,
    color: "var(--text-secondary)",
  },
  allEventsRow: {
    border: "1px solid var(--cream-dark)",
    borderRadius: 10,
    background: "var(--white)",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    textAlign: "left",
  },
  pastEventsRow: {
    border: "1px solid var(--cream-dark)",
    borderRadius: 10,
    background: "var(--cream)",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
  },
  allEventsDate: {
    fontSize: 12.5,
    color: "var(--text-muted)",
    minWidth: 118,
    fontWeight: 600,
  },
  allEventsInfo: { flex: 1 },
  allEventsName: {
    fontWeight: 600,
    fontSize: 14,
    color: "var(--text-primary)",
    marginBottom: 2,
  },
  allEventsMeta: {
    fontSize: 12.5,
    color: "var(--text-muted)",
  },
};
