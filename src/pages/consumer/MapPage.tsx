import { IconMap, IconLeaf, IconClock, IconPin } from "../../components/Icons";
import React, { useState } from "react";
import { useVendors } from "../../hooks/useVendors";
import { useMarketEvents } from "../../hooks/useMarketEvents";
import VendorCard from "../../components/consumer/VendorCard";
import MarketMap, { BoothPosition } from "../../components/consumer/MarketMap";

const CATEGORIES = [
  "All",
  "Farmers, Fishers, Foragers",
  "Food & Beverage Producers",
  "Prepared Food",
];

export default function MapPage() {
  const { vendors, loading } = useVendors();
  const { events, loading: eLoading } = useMarketEvents();
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [mapTab, setMapTab] = useState<"map" | "list">("map");

  const publishedEvents = events
    .filter((e) => e.isPublished && new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const nextEvent = publishedEvents[0] ?? null;

  // Build BoothPosition[] from the event's boothMap
  const booths: BoothPosition[] = nextEvent?.boothMap
    ? Object.values(nextEvent.boothMap as Record<string, any>).filter(
        (b): b is BoothPosition =>
          b && typeof b === "object" && "vendorSlug" in b && "x" in b
      )
    : [];

  const filtered = vendors.filter((v) => {
    const matchCat = activeCategory === "All" || v.category === activeCategory;
    const matchSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Market Map</div>
        <div className="topbar-search">
          <input
            placeholder="Search vendors, products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="page-content">
        {/* Next event hero banner */}
        {!eLoading && nextEvent && (
          <div style={s.heroBanner}>
            <div style={s.heroBannerLeft}>
              <div style={s.heroBannerLabel}>Next market day</div>
              <div style={s.heroBannerName}>{nextEvent.name}</div>
              <div style={s.heroBannerDetails}>
                <span>{nextEvent.hours}</span>
                <span style={{ margin: "0 8px", opacity: 0.4 }}>·</span>
                <span>{nextEvent.address}</span>
              </div>
            </div>
            <div style={s.heroBannerDate}>
              <div style={s.heroBannerDay}>
                {new Date(nextEvent.date).getDate()}
              </div>
              <div style={s.heroBannerMonth}>
                {new Date(nextEvent.date).toLocaleString("default", {
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
                    style={{
                      ...s.eventCard,
                      border:
                        i === 0
                          ? "2px solid var(--forest-mid)"
                          : "1px solid var(--cream-dark)",
                    }}
                  >
                    {i === 0 && <div style={s.nextBadge}>Next market</div>}
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

        {/* Map / List tabs */}
        <div
          style={{
            display: "flex",
            gap: 0,
            marginBottom: 20,
            borderBottom: "1px solid var(--cream-dark)",
          }}
        >
          {(["map", "list"] as const).map((t) => (
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
              {t === "map" ? "Market Map" : "Browse Vendors"}
            </button>
          ))}
        </div>

        {/* MAP TAB */}
        {mapTab === "map" && (
          <div>
            {nextEvent ? (
              booths.length > 0 ? (
                <MarketMap booths={booths} />
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
                    The admin hasn't assigned booths for this market day
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

        {/* LIST TAB */}
        {mapTab === "list" && (
          <div>
            <div
              style={{
                display: "flex",
                gap: 16,
                alignItems: "center",
                marginBottom: 20,
                flexWrap: "wrap",
              }}
            >
              <div className="filter-bar" style={{ margin: 0 }}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className={`filter-chip ${
                      activeCategory === cat ? "active" : ""
                    }`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat === "Farmers, Fishers, Foragers"
                      ? "Farmers"
                      : cat === "Food & Beverage Producers"
                      ? "Producers"
                      : cat === "Prepared Food"
                      ? "Prepared Food"
                      : cat}
                  </button>
                ))}
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginLeft: "auto",
                }}
              >
                {filtered.length} vendors
              </span>
            </div>

            {loading ? (
              <div className="loading-spinner">Loading vendors...</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <h3>No vendors found</h3>
                <p>Try adjusting your search or filter</p>
              </div>
            ) : (
              <div className="vendor-grid">
                {filtered.map((vendor) => (
                  <VendorCard key={vendor.objectId} vendor={vendor} />
                ))}
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
};
