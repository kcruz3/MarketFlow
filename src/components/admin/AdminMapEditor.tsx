import React, { useState, useRef, useCallback, useEffect } from "react";
import { parseBoothMap } from "../../lib/marketEvents";
import { Vendor } from "../../hooks/useVendors";
import { BoothPosition } from "../consumer/MarketMap";

interface Props {
  vendors: Vendor[];
  initialBooths?: BoothPosition[];
  onChange: (booths: BoothPosition[]) => void;
  width?: number;
  height?: number;
}

const SNAP = 20;
const MIN_SIZE = 60;
const CANVAS_W = 800;
const CANVAS_H = 520;

function snap(n: number) {
  return Math.round(n / SNAP) * SNAP;
}

let nextId = 1;

export default function AdminMapEditor({
  vendors,
  initialBooths = [],
  onChange,
  width = CANVAS_W,
  height = CANVAS_H,
}: Props) {
  const [booths, setBooths] = useState<BoothPosition[]>(() =>
    parseBoothMap(initialBooths)
  );
  const [tool, setTool] = useState<"draw" | "select">("draw");
  const [drawing, setDrawing] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{
    boothId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [assigningTo, setAssigningTo] = useState<string | null>(null);
  const [vendorSearch, setVendorSearch] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const parsed = parseBoothMap(initialBooths);
    if (parsed.length) setBooths(parsed);
  }, []);

  const getSVGPoint = (e: React.MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: snap(e.clientX - rect.left),
      y: snap(e.clientY - rect.top),
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      e.target === svgRef.current ||
      ((e.target as SVGElement).tagName === "rect" &&
        (e.target as SVGElement).dataset.bg)
    ) {
      const pt = getSVGPoint(e);
      if (tool === "draw") {
        startRef.current = pt;
        setDrawing({ x: pt.x, y: pt.y, w: 0, h: 0 });
        setSelected(null);
      } else {
        setSelected(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (tool === "draw" && startRef.current && drawing) {
      const pt = getSVGPoint(e);
      setDrawing({
        x: Math.min(startRef.current.x, pt.x),
        y: Math.min(startRef.current.y, pt.y),
        w: Math.abs(pt.x - startRef.current.x),
        h: Math.abs(pt.y - startRef.current.y),
      });
    }
    if (dragging) {
      const pt = getSVGPoint(e);
      setBooths((prev) =>
        prev.map((b) =>
          b.boothId === dragging.boothId
            ? {
                ...b,
                x: Math.max(0, pt.x - dragging.offsetX),
                y: Math.max(0, pt.y - dragging.offsetY),
              }
            : b
        )
      );
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (tool === "draw" && drawing && startRef.current) {
      const finalW = snap(drawing.w);
      const finalH = snap(drawing.h);
      if (finalW >= MIN_SIZE && finalH >= MIN_SIZE) {
        const id = `B${nextId++}`;
        const newBooth: BoothPosition = {
          boothId: id,
          vendorSlug: "",
          vendorName: "Empty booth",
          category: "default",
          x: drawing.x,
          y: drawing.y,
          w: finalW,
          h: finalH,
        };
        const updated = [...booths, newBooth];
        setBooths(updated);
        onChange(updated);
        setSelected(id);
        setAssigningTo(id);
      }
      setDrawing(null);
      startRef.current = null;
    }
    if (dragging) {
      setDragging(null);
      onChange(booths);
    }
  };

  const handleBoothClick = (e: React.MouseEvent, boothId: string) => {
    e.stopPropagation();
    if (tool === "select") {
      setSelected(boothId);
    }
  };

  const handleBoothMouseDown = (e: React.MouseEvent, booth: BoothPosition) => {
    if (tool !== "select") return;
    e.stopPropagation();
    const pt = getSVGPoint(e);
    setDragging({
      boothId: booth.boothId,
      offsetX: pt.x - booth.x,
      offsetY: pt.y - booth.y,
    });
    setSelected(booth.boothId);
  };

  const deleteBooth = (boothId: string) => {
    const updated = booths.filter((b) => b.boothId !== boothId);
    setBooths(updated);
    onChange(updated);
    setSelected(null);
  };

  const assignVendor = (boothId: string, vendor: Vendor) => {
    // Keep one booth per vendor: move assignment from any previous booth.
    const updated = booths.map((b) => {
      if (b.boothId === boothId) {
        return {
          ...b,
          vendorId: vendor.objectId,
          vendorSlug: vendor.slug,
          vendorName: vendor.name,
          category: vendor.category,
        };
      }

      if (b.vendorSlug === vendor.slug) {
        return {
          ...b,
          vendorSlug: "",
          vendorName: "Empty booth",
          category: "default",
        };
      }

      return b;
    });
    setBooths(updated);
    onChange(updated);
    setAssigningTo(null);
    setVendorSearch("");
  };

  const clearVendor = (boothId: string) => {
    const updated = booths.map((b) =>
      b.boothId === boothId
        ? {
            ...b,
            vendorId: "",
            vendorSlug: "",
            vendorName: "Empty booth",
            category: "default",
          }
        : b
    );
    setBooths(updated);
    onChange(updated);
  };

  const vendorAssignedBooth = new Map(
    booths
      .filter((b) => b.vendorSlug)
      .map((b) => [b.vendorSlug, b.boothId])
  );
  const assignableVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const selectedBooth = booths.find((b) => b.boothId === selected);

  const COLORS: Record<string, { fill: string; stroke: string; text: string }> =
    {
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
      default: { fill: "#f1efea", stroke: "#aaa89a", text: "#666655" },
    };

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      {/* Canvas */}
      <div style={{ flex: 1 }}>
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 10,
            alignItems: "center",
          }}
        >
          <button
            onClick={() => setTool("draw")}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: "1px solid",
              borderColor:
                tool === "draw" ? "var(--forest-mid)" : "var(--cream-dark)",
              background: tool === "draw" ? "var(--sage-pale)" : "var(--white)",
              color:
                tool === "draw" ? "var(--forest)" : "var(--text-secondary)",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
              fontWeight: tool === "draw" ? 500 : 400,
            }}
          >
            Draw booth
          </button>
          <button
            onClick={() => setTool("select")}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: "1px solid",
              borderColor:
                tool === "select" ? "var(--forest-mid)" : "var(--cream-dark)",
              background:
                tool === "select" ? "var(--sage-pale)" : "var(--white)",
              color:
                tool === "select" ? "var(--forest)" : "var(--text-secondary)",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
              fontWeight: tool === "select" ? 500 : 400,
            }}
          >
            Select / move
          </button>
          <span
            style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}
          >
            {booths.length} booths · {booths.filter((b) => b.vendorSlug).length}{" "}
            assigned
          </span>
          {booths.length > 0 && (
            <button
              onClick={() => {
                setBooths([]);
                onChange([]);
              }}
              style={{
                marginLeft: "auto",
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid #ffcdd2",
                background: "#fff0f0",
                color: "#c62828",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              Clear all
            </button>
          )}
        </div>

        <div
          style={{
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid var(--cream-dark)",
            background: "#f9f6f0",
            cursor: tool === "draw" ? "crosshair" : "default",
          }}
        >
          <svg
            ref={svgRef}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{ display: "block", userSelect: "none" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Background */}
            <rect data-bg="true" width={width} height={height} fill="#f9f6f0" />

            {/* Grid dots */}
            {Array.from({ length: Math.floor(height / SNAP) }).map((_, row) =>
              Array.from({ length: Math.floor(width / SNAP) }).map((_, col) => (
                <circle
                  key={`${row}-${col}`}
                  cx={col * SNAP}
                  cy={row * SNAP}
                  r={1}
                  fill="#d8d0c4"
                  opacity="0.5"
                />
              ))
            )}

            {/* Entrance */}
            <rect
              x={width / 2 - 50}
              y={height - 36}
              width={100}
              height={24}
              rx={6}
              fill="#1a3a2a"
            />
            <text
              x={width / 2}
              y={height - 20}
              textAnchor="middle"
              fill="white"
              fontSize="10"
              fontFamily="DM Sans, sans-serif"
              fontWeight="600"
              letterSpacing="1.2"
            >
              ENTRANCE
            </text>

            {/* Booths */}
            {booths.map((booth) => {
              const isSelected = selected === booth.boothId;
              const col = COLORS[booth.category] ?? COLORS["default"];
              const cx = booth.x + booth.w / 2;
              const cy = booth.y + booth.h / 2;

              return (
                <g
                  key={booth.boothId}
                  style={{ cursor: tool === "select" ? "move" : "pointer" }}
                  onClick={(e) => handleBoothClick(e, booth.boothId)}
                  onMouseDown={(e) => handleBoothMouseDown(e, booth)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setAssigningTo(booth.boothId);
                    setSelected(booth.boothId);
                  }}
                >
                  <rect
                    x={booth.x}
                    y={booth.y}
                    width={booth.w}
                    height={booth.h}
                    rx={6}
                    fill={col.fill}
                    stroke={isSelected ? "#1D9E75" : col.stroke}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  <text
                    x={booth.x + 5}
                    y={booth.y + 11}
                    fill={col.stroke}
                    fontSize="8"
                    fontFamily="DM Sans, sans-serif"
                    fontWeight="700"
                    opacity="0.7"
                  >
                    {booth.boothId}
                  </text>
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={col.text}
                    fontSize={booth.w < 90 ? 9 : 10}
                    fontFamily="DM Sans, sans-serif"
                    fontWeight="500"
                  >
                    {booth.vendorSlug
                      ? booth.vendorName.split(" ").slice(0, 3).join(" ")
                      : "+ assign"}
                  </text>
                  {isSelected && (
                    <rect
                      x={booth.x - 3}
                      y={booth.y - 3}
                      width={booth.w + 6}
                      height={booth.h + 6}
                      rx={9}
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

            {/* Drawing preview */}
            {drawing && drawing.w > 10 && drawing.h > 10 && (
              <rect
                x={drawing.x}
                y={drawing.y}
                width={drawing.w}
                height={drawing.h}
                rx={6}
                fill="rgba(45,90,61,0.08)"
                stroke="#2d5a3d"
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />
            )}
          </svg>
        </div>

        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
          {tool === "draw"
            ? "Click and drag to draw a booth. Double-click a booth to assign a vendor."
            : "Click to select a booth, drag to move it. Double-click to assign a vendor."}
        </div>
      </div>

      {/* Side panel */}
      <div style={{ width: 220, flexShrink: 0 }}>
        {assigningTo ? (
          <div
            style={{
              background: "var(--white)",
              border: "1px solid var(--cream-dark)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                background: "var(--sage-pale)",
                borderBottom: "1px solid var(--cream-dark)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--forest)",
                }}
              >
                Assign vendor
              </span>
              <button
                onClick={() => {
                  setAssigningTo(null);
                  setVendorSearch("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "var(--text-muted)",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: 10 }}>
              <input
                value={vendorSearch}
                onChange={(e) => setVendorSearch(e.target.value)}
                placeholder="Search vendors..."
                autoFocus
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: 7,
                  border: "1px solid var(--cream-dark)",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "DM Sans, sans-serif",
                  boxSizing: "border-box" as const,
                }}
              />
            </div>
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {booths.find((b) => b.boothId === assigningTo)?.vendorSlug && (
                <div
                  onClick={() => clearVendor(assigningTo!)}
                  style={{
                    padding: "8px 14px",
                    cursor: "pointer",
                    fontSize: 12,
                    color: "#c62828",
                    borderBottom: "1px solid var(--cream-dark)",
                  }}
                >
                  ✕ Clear vendor
                </div>
              )}
              {assignableVendors.length === 0 ? (
                <div
                  style={{
                    padding: "12px 14px",
                    fontSize: 12,
                    color: "var(--text-muted)",
                    textAlign: "center",
                  }}
                >
                  {vendors.length === 0 ? "No vendors loaded" : "No vendors match your search"}
                </div>
              ) : (
                assignableVendors.map((v) => {
                  const currentlyAssignedBooth = vendorAssignedBooth.get(v.slug);
                  const isAssignedElsewhere =
                    currentlyAssignedBooth && currentlyAssignedBooth !== assigningTo;

                  return (
                  <div
                    key={v.slug}
                    onClick={() => assignVendor(assigningTo!, v)}
                    style={{
                      padding: "9px 14px",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--cream-dark)",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f1efea")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "white")
                    }
                    >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--text-primary)",
                      }}
                    >
                      {v.name}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: isAssignedElsewhere ? "#a45818" : "var(--text-muted)",
                      }}
                    >
                      {v.subcategory || v.category}
                      {isAssignedElsewhere
                        ? ` · currently at ${currentlyAssignedBooth}`
                        : currentlyAssignedBooth
                        ? " · currently here"
                        : ""}
                    </div>
                  </div>
                )})
              )}
            </div>
          </div>
        ) : selectedBooth ? (
          <div
            style={{
              background: "var(--white)",
              border: "1px solid var(--cream-dark)",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                marginBottom: 6,
              }}
            >
              Booth {selectedBooth.boothId}
            </div>
            <div
              style={{
                fontFamily: "Playfair Display, serif",
                fontSize: 15,
                color: "var(--forest)",
                marginBottom: 4,
              }}
            >
              {selectedBooth.vendorSlug
                ? selectedBooth.vendorName
                : "Unassigned"}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                marginBottom: 14,
              }}
            >
              {selectedBooth.w} × {selectedBooth.h}px
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => setAssigningTo(selectedBooth.boothId)}
                style={{
                  padding: "8px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--forest-mid)",
                  color: "white",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                {selectedBooth.vendorSlug
                  ? "↺ Reassign vendor"
                  : "+ Assign vendor"}
              </button>
              {selectedBooth.vendorSlug && (
                <button
                  onClick={() => clearVendor(selectedBooth.boothId)}
                  style={{
                    padding: "7px",
                    borderRadius: 8,
                    border: "1px solid var(--cream-dark)",
                    background: "var(--cream)",
                    color: "var(--text-secondary)",
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  Clear vendor
                </button>
              )}
              <button
                onClick={() => deleteBooth(selectedBooth.boothId)}
                style={{
                  padding: "7px",
                  borderRadius: 8,
                  border: "1px solid #ffcdd2",
                  background: "#fff0f0",
                  color: "#c62828",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                Delete booth
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "var(--cream)",
              border: "1px solid var(--cream-dark)",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--forest)",
                marginBottom: 8,
              }}
            >
              How to use
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.7,
              }}
            >
              <div style={{ marginBottom: 6 }}>
                1. Select <strong>Draw booth</strong> and drag on the canvas to
                create a booth
              </div>
              <div style={{ marginBottom: 6 }}>
                2. Switch to <strong>Select / move</strong> to drag booths
                around
              </div>
              <div style={{ marginBottom: 6 }}>
                3. Click a booth to select it, then assign a vendor
              </div>
              <div>4. Double-click any booth to quickly assign a vendor</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
