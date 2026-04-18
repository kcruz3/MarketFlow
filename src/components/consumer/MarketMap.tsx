import React, { useState, useRef, useEffect } from "react";
import { IconLeaf, IconJar, IconUtensilsCrossed, IconMap } from "../Icons";

export interface BoothPosition {
  vendorSlug: string;
  vendorId?: string;
  vendorName: string;
  averageRating?: number | null;
  reviewCount?: number | null;
  category: string;
  x: number;
  y: number;
  w: number;
  h: number;
  boothId: string;
}

interface Props {
  booths: BoothPosition[];
  width?: number;
  height?: number;
}

const CATEGORY_COLORS: Record<
  string,
  { fill: string; stroke: string; text: string }
> = {
  "Farmers, Fishers, Foragers": {
    fill: "#e8f0e9",
    stroke: "#2d5a3d",
    text: "#1a3a2a",
  },
  "Food & Beverage Producers": {
    fill: "#fef3dc",
    stroke: "#c8841a",
    text: "#5c3d1e",
  },
  "Prepared Food": { fill: "#fbeae7", stroke: "#c8441a", text: "#5c1e1e" },
  default: { fill: "#f1efea", stroke: "#888780", text: "#444441" },
};

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS["default"];
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

export default function MarketMap({
  booths,
  width = 800,
  height = 520,
}: Props) {
  const [selected, setSelected] = useState<BoothPosition | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (svgRef.current && !svgRef.current.contains(e.target as Node)) {
        setSelected(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && containerRef.current) {
        await containerRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore browser fullscreen failures and leave the current mode intact.
    }
  };

  const PADDING = 40;
  const AISLE_W = 24;
  const ENTRANCE_Y = height - 40;

  return (
    <div
      ref={containerRef}
      className={`market-map-shell ${isFullscreen ? "is-fullscreen" : ""}`}
      style={{ position: "relative", width: "100%" }}
    >
      {/* Legend */}
      <div className="market-map-toolbar">
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          {Object.entries(CATEGORY_COLORS)
            .filter(([k]) => k !== "default")
            .map(([cat, col]) => (
              <div
                key={cat}
                style={{ display: "flex", alignItems: "center", gap: 5 }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: col.fill,
                    border: `1.5px solid ${col.stroke}`,
                  }}
                />
                <span>
                  {cat === "Farmers, Fishers, Foragers"
                    ? "Farmers"
                    : cat === "Food & Beverage Producers"
                    ? "Producers"
                    : "Prepared Food"}
                </span>
              </div>
            ))}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: "#e1f5ee",
                border: "1.5px solid #1D9E75",
              }}
            />
            <span>Selected</span>
          </div>
        </div>
        <button
          className="market-map-fullscreen-btn"
          onClick={toggleFullscreen}
          type="button"
        >
          {isFullscreen ? "Exit full screen" : "Full screen"}
        </button>
      </div>

      <div className={`market-map-frame ${isFullscreen ? "is-fullscreen" : ""}`}>
        <div className="market-map-canvas">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ display: "block", minWidth: width }}
          onClick={() => setSelected(null)}
        >
          {/* Background */}
          <rect width={width} height={height} fill="#f9f6f0" />

          {/* Path / ground markings */}
          <rect
            x={PADDING}
            y={PADDING}
            width={width - PADDING * 2}
            height={height - PADDING * 2}
            fill="none"
            stroke="#d8d0c4"
            strokeWidth="1"
            strokeDasharray="6 4"
            rx="8"
          />

          {/* Entrance indicator */}
          <rect
            x={width / 2 - 50}
            y={ENTRANCE_Y - 4}
            width={100}
            height={28}
            rx={6}
            fill="#1a3a2a"
          />
          <text
            x={width / 2}
            y={ENTRANCE_Y + 12}
            textAnchor="middle"
            fill="white"
            fontSize="11"
            fontFamily="DM Sans, sans-serif"
            fontWeight="600"
            letterSpacing="1.2"
          >
            ENTRANCE
          </text>

          {/* Center aisle hint */}
          <line
            x1={width / 2}
            y1={PADDING + 10}
            x2={width / 2}
            y2={ENTRANCE_Y - 10}
            stroke="#d8d0c4"
            strokeWidth="1"
            strokeDasharray="4 6"
          />

          {/* Empty state */}
          {booths.length === 0 && (
            <>
              <text
                x={width / 2}
                y={height / 2 - 16}
                textAnchor="middle"
                fill="#9a9a8a"
                fontSize="14"
                fontFamily="DM Sans, sans-serif"
              >
                No booths published
              </text>
              <text
                x={width / 2}
                y={height / 2 + 16}
                textAnchor="middle"
                fill="#9a9a8a"
                fontSize="14"
                fontFamily="DM Sans, sans-serif"
              >
                Booth layout not published yet
              </text>
            </>
          )}

          {/* Booth cells */}
          {booths.map((booth, index) => {
            const isSelected = selected?.boothId === booth.boothId;
            const isHovered = hovered === booth.boothId;
            const col = getCategoryColor(booth.category);

            const fillColor = isSelected
              ? "#e1f5ee"
              : isHovered
              ? col.fill
              : col.fill;
            const strokeColor = isSelected ? "#1D9E75" : col.stroke;
            const strokeWidth = isSelected ? 2.5 : isHovered ? 2 : 1.5;
            const labelLines = booth.vendorName.split(" ");
            const line1 = truncate(
              labelLines.slice(0, Math.ceil(labelLines.length / 2)).join(" "),
              14
            );
            const line2 = truncate(
              labelLines.slice(Math.ceil(labelLines.length / 2)).join(" "),
              14
            );
            const cx = booth.x + booth.w / 2;
            const cy = booth.y + booth.h / 2;
            const fontSize = booth.w < 80 ? 9 : 10;

            return (
              <g
                key={`${booth.boothId}-${index}`}
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(isSelected ? null : booth);
                }}
                onMouseEnter={() => setHovered(booth.boothId)}
                onMouseLeave={() => setHovered(null)}
              >
                <rect
                  x={booth.x}
                  y={booth.y}
                  width={booth.w}
                  height={booth.h}
                  rx={6}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  style={{ transition: "all 0.15s" }}
                />
                {/* Booth ID label */}
                <text
                  x={booth.x + 5}
                  y={booth.y + 11}
                  fill={col.stroke}
                  fontSize="9"
                  fontFamily="DM Sans, sans-serif"
                  fontWeight="600"
                  opacity="0.7"
                >
                  {booth.boothId}
                </text>
                {/* Vendor name */}
                {booth.h >= 40 ? (
                  <>
                    <text
                      x={cx}
                      y={line2 ? cy - 6 : cy}
                      textAnchor="middle"
                      fill={col.text}
                      fontSize={fontSize}
                      fontFamily="DM Sans, sans-serif"
                      fontWeight="500"
                      dominantBaseline="central"
                    >
                      {line1}
                    </text>
                    {line2 && (
                      <text
                        x={cx}
                        y={cy + 8}
                        textAnchor="middle"
                        fill={col.text}
                        fontSize={fontSize}
                        fontFamily="DM Sans, sans-serif"
                        fontWeight="500"
                        dominantBaseline="central"
                      >
                        {line2}
                      </text>
                    )}
                  </>
                ) : (
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    fill={col.text}
                    fontSize={fontSize}
                    fontFamily="DM Sans, sans-serif"
                    fontWeight="500"
                    dominantBaseline="central"
                  >
                    {truncate(booth.vendorName, 12)}
                  </text>
                )}
                {/* Selected ring pulse */}
                {isSelected && (
                  <rect
                    x={booth.x - 3}
                    y={booth.y - 3}
                    width={booth.w + 6}
                    height={booth.h + 6}
                    rx={8}
                    fill="none"
                    stroke="#1D9E75"
                    strokeWidth="1.5"
                    opacity="0.4"
                    strokeDasharray="4 3"
                  />
                )}
              </g>
            );
          })}
        </svg>
        </div>

        {/* Vendor popover panel */}
        {selected && (
          (() => {
            const ratingValue =
              typeof selected.averageRating === "number" &&
              Number.isFinite(selected.averageRating)
                ? selected.averageRating
                : null;
            const reviewCount =
              typeof selected.reviewCount === "number" &&
              Number.isFinite(selected.reviewCount)
                ? selected.reviewCount
                : 0;
            const hasRatings = ratingValue !== null;

            return (
          <div
            style={{
              position: "absolute",
              top: Math.min(selected.y, height - 220),
              left:
                selected.x + selected.w + 12 > width - 200
                  ? selected.x - 212
                  : selected.x + selected.w + 12,
              width: 200,
              background: "white",
              borderRadius: 12,
              border: "1px solid var(--cream-dark)",
              boxShadow: "0 8px 24px rgba(26,58,42,0.15)",
              padding: 16,
              zIndex: 10,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                marginBottom: 4,
              }}
            >
              Booth {selected.boothId}
            </div>
            <div
              style={{
                fontFamily: "Playfair Display, serif",
                fontSize: 15,
                color: "var(--green-deep)",
                marginBottom: 4,
                lineHeight: 1.3,
              }}
            >
              {selected.vendorName}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                marginBottom: 10,
              }}
            >
              {selected.category === "Farmers, Fishers, Foragers"
                ? "Farmer"
                : selected.category === "Food & Beverage Producers"
                ? "Producer"
                : "Prepared Food"}
            </div>
            <div
              style={{
                width: "100%",
                padding: "9px 10px",
                borderRadius: 8,
                border: "1px solid var(--cream-dark)",
                background: "var(--cream)",
                color: "var(--text-secondary)",
                fontSize: 12.5,
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.7px",
                  color: "var(--text-muted)",
                  marginBottom: 3,
                }}
              >
                Average rating
              </div>
              <div
                style={{
                  fontWeight: 600,
                  color: "var(--forest)",
                  fontSize: 13.5,
                }}
              >
                {hasRatings
                  ? reviewCount > 0
                    ? `${ratingValue.toFixed(1)} / 5 (${reviewCount})`
                    : `${ratingValue.toFixed(1)} / 5`
                  : "No ratings yet"}
              </div>
            </div>
          </div>
            );
          })()
        )}
      </div>

      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          marginTop: 8,
          textAlign: "center",
        }}
      >
        Click any booth to see vendor details
      </div>
    </div>
  );
}
