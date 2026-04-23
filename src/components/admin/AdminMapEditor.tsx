import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseBoothMap } from "../../lib/marketEvents";
import { Vendor } from "../../hooks/useVendors";
import { BoothPosition } from "../consumer/MarketMap";

interface Props {
  vendors: Vendor[];
  initialBooths?: BoothPosition[];
  onChange: (booths: BoothPosition[]) => void;
  pastLayoutByVendorSlug?: Map<string, { boothId: string; category: string }>;
  width?: number;
  height?: number;
}

type Tool = "draw" | "select";
type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const SNAP = 20;
const MIN_SIZE = 60;
const CANVAS_W = 800;
const CANVAS_H = 520;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.4;

function snap(n: number) {
  return Math.round(n / SNAP) * SNAP;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function cloneBooths(booths: BoothPosition[]) {
  return booths.map((booth) => ({ ...booth }));
}

function makeSignature(booths: BoothPosition[]) {
  return booths
    .map((booth) =>
      [
        booth.boothId,
        booth.x,
        booth.y,
        booth.w,
        booth.h,
        booth.vendorSlug || "",
        booth.vendorName || "",
        booth.category || "",
      ].join("|")
    )
    .sort()
    .join("::");
}

function intersectsRect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function getNextBoothNumber(booths: BoothPosition[]) {
  const max = booths.reduce((acc, booth) => {
    const match = booth.boothId.match(/^B(\d+)$/i);
    if (!match) return acc;
    return Math.max(acc, Number(match[1]));
  }, 0);
  return max + 1;
}

function normalizeSelectionRect(
  start: { x: number; y: number },
  current: { x: number; y: number }
) {
  return {
    x: Math.min(start.x, current.x),
    y: Math.min(start.y, current.y),
    w: Math.abs(current.x - start.x),
    h: Math.abs(current.y - start.y),
  };
}

export default function AdminMapEditor({
  vendors,
  initialBooths = [],
  onChange,
  pastLayoutByVendorSlug = new Map(),
  width = CANVAS_W,
  height = CANVAS_H,
}: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nextIdRef = useRef(1);
  const interactionDirtyRef = useRef(false);
  const historyRef = useRef<BoothPosition[][]>([]);
  const historyIndexRef = useRef(-1);

  const [booths, setBooths] = useState<BoothPosition[]>(() =>
    parseBoothMap(initialBooths)
  );
  const [tool, setTool] = useState<Tool>("draw");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assigningTo, setAssigningTo] = useState<string | null>(null);
  const [vendorSearch, setVendorSearch] = useState("");
  const [quickAssignMode, setQuickAssignMode] = useState(false);

  const [drawing, setDrawing] = useState<{
    start: { x: number; y: number };
    current: { x: number; y: number };
  } | null>(null);
  const [boxSelecting, setBoxSelecting] = useState<{
    start: { x: number; y: number };
    current: { x: number; y: number };
    additive: boolean;
  } | null>(null);
  const [dragging, setDragging] = useState<{
    ids: string[];
    startPoint: { x: number; y: number };
    startRects: Record<string, { x: number; y: number; w: number; h: number }>;
  } | null>(null);
  const [resizing, setResizing] = useState<{
    boothId: string;
    handle: ResizeHandle;
    startPoint: { x: number; y: number };
    startRect: { x: number; y: number; w: number; h: number };
  } | null>(null);

  const [guides, setGuides] = useState<{ vertical: number[]; horizontal: number[] }>({
    vertical: [],
    horizontal: [],
  });
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    boothId: string;
  } | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [viewportRect, setViewportRect] = useState({ x: 0, y: 0, w: width, h: height });

  const COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
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

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedBooths = useMemo(
    () => booths.filter((booth) => selectedSet.has(booth.boothId)),
    [booths, selectedSet]
  );
  const primarySelectedId = selectedIds[selectedIds.length - 1] ?? null;
  const primarySelectedBooth =
    booths.find((booth) => booth.boothId === primarySelectedId) ?? null;

  const overlapIds = useMemo(() => {
    const ids = new Set<string>();
    for (let i = 0; i < booths.length; i += 1) {
      for (let j = i + 1; j < booths.length; j += 1) {
        if (intersectsRect(booths[i], booths[j])) {
          ids.add(booths[i].boothId);
          ids.add(booths[j].boothId);
        }
      }
    }
    return ids;
  }, [booths]);

  const vendorAssignedBooths = useMemo(() => {
    const byVendor = new Map<string, string[]>();
    booths
      .filter((booth) => booth.vendorSlug)
      .forEach((booth) => {
        const list = byVendor.get(booth.vendorSlug) || [];
        list.push(booth.boothId);
        byVendor.set(booth.vendorSlug, list);
      });
    return byVendor;
  }, [booths]);

  const assignableVendors = useMemo(
    () => {
      const targetBooth = assigningTo
        ? booths.find((booth) => booth.boothId === assigningTo) || null
        : null;

      const scoreVendor = (vendor: Vendor) => {
        const previous = pastLayoutByVendorSlug.get(vendor.slug);
        let score = 0;
        if (previous?.boothId && assigningTo && previous.boothId === assigningTo) score += 150;
        if (
          previous?.category &&
          targetBooth?.category &&
          previous.category === targetBooth.category
        ) {
          score += 40;
        }
        if (targetBooth?.category && vendor.category === targetBooth.category) score += 30;
        if (previous?.boothId) score += 10;
        return score;
      };

      return vendors
        .filter((vendor) =>
          vendor.name.toLowerCase().includes(vendorSearch.toLowerCase())
        )
        .sort((left, right) => {
          const scoreDiff = scoreVendor(right) - scoreVendor(left);
          if (scoreDiff !== 0) return scoreDiff;
          return left.name.localeCompare(right.name);
        });
    },
    [assigningTo, booths, pastLayoutByVendorSlug, vendors, vendorSearch]
  );

  const commitBooths = useCallback(
    (nextBooths: BoothPosition[]) => {
      const next = cloneBooths(nextBooths);
      const nextSig = makeSignature(next);
      const current = historyRef.current[historyIndexRef.current];
      if (current && makeSignature(current) === nextSig) {
        setBooths(next);
        return;
      }

      const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1);
      trimmed.push(next);
      historyRef.current = trimmed;
      historyIndexRef.current = trimmed.length - 1;
      setBooths(next);
      onChange(next);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(false);
    },
    [onChange]
  );

  const resetHistory = useCallback(
    (nextBooths: BoothPosition[]) => {
      const snapshot = cloneBooths(nextBooths);
      historyRef.current = [snapshot];
      historyIndexRef.current = 0;
      setBooths(snapshot);
      setCanUndo(false);
      setCanRedo(false);
      nextIdRef.current = getNextBoothNumber(snapshot);
    },
    []
  );

  useEffect(() => {
    resetHistory(parseBoothMap(initialBooths));
  }, [initialBooths, resetHistory]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const closeContext = () => setContextMenu(null);
    window.addEventListener("mousedown", closeContext);
    return () => {
      window.removeEventListener("mousedown", closeContext);
    };
  }, []);

  const updateViewportRect = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    setViewportRect({
      x: viewport.scrollLeft / zoom,
      y: viewport.scrollTop / zoom,
      w: viewport.clientWidth / zoom,
      h: viewport.clientHeight / zoom,
    });
  }, [zoom]);

  useEffect(() => {
    updateViewportRect();
  }, [updateViewportRect, zoom, booths.length, isFullscreen]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onScroll = () => updateViewportRect();
    viewport.addEventListener("scroll", onScroll);
    return () => viewport.removeEventListener("scroll", onScroll);
  }, [updateViewportRect]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snapshot = cloneBooths(historyRef.current[historyIndexRef.current]);
    setBooths(snapshot);
    onChange(snapshot);
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);
    setSelectedIds([]);
  }, [onChange]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const snapshot = cloneBooths(historyRef.current[historyIndexRef.current]);
    setBooths(snapshot);
    onChange(snapshot);
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    setSelectedIds([]);
  }, [onChange]);

  const fitToViewport = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const fit = Math.min(
      (viewport.clientWidth - 24) / width,
      (viewport.clientHeight - 24) / height
    );
    setZoom(clamp(Number.isFinite(fit) ? fit : 1, MIN_ZOOM, MAX_ZOOM));
  }, [height, width]);

  const setZoomBy = (delta: number) => {
    setZoom((current) => clamp(Number((current + delta).toFixed(2)), MIN_ZOOM, MAX_ZOOM));
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && shellRef.current) {
        await shellRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen API errors and keep current editor mode.
    }
  };

  const getSVGPoint = (e: React.MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: snap((e.clientX - rect.left) / zoom),
      y: snap((e.clientY - rect.top) / zoom),
    };
  };

  const getNextEmptyBooth = useCallback(
    (currentBoothId?: string | null) => {
      if (booths.length === 0) return null;
      const startIndex = currentBoothId
        ? booths.findIndex((booth) => booth.boothId === currentBoothId)
        : -1;
      const ordered = [...booths];
      for (let i = 1; i <= ordered.length; i += 1) {
        const idx = (startIndex + i + ordered.length) % ordered.length;
        if (!ordered[idx].vendorSlug) return ordered[idx].boothId;
      }
      return null;
    },
    [booths]
  );

  const beginQuickAssign = useCallback(
    (preferredBoothId?: string) => {
      const target =
        preferredBoothId ||
        primarySelectedId ||
        getNextEmptyBooth(null) ||
        booths[0]?.boothId ||
        null;
      if (!target) return;
      setAssigningTo(target);
      setQuickAssignMode(true);
      setVendorSearch("");
    },
    [booths, getNextEmptyBooth, primarySelectedId]
  );

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const selectedIdSet = new Set(selectedIds);
    const next = booths.filter((booth) => !selectedIdSet.has(booth.boothId));
    setSelectedIds([]);
    setAssigningTo(null);
    commitBooths(next);
  }, [booths, commitBooths, selectedIds]);

  const duplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const selectedIdSet = new Set(selectedIds);
    const duplicates = booths
      .filter((booth) => selectedIdSet.has(booth.boothId))
      .map((booth) => ({
        ...booth,
        boothId: `B${nextIdRef.current++}`,
        x: clamp(snap(booth.x + SNAP), 0, width - booth.w),
        y: clamp(snap(booth.y + SNAP), 0, height - booth.h),
        vendorId: "",
        vendorSlug: "",
        vendorName: "Empty booth",
        category: "default",
      }));
    const next = [...booths, ...duplicates];
    setSelectedIds(duplicates.map((booth) => booth.boothId));
    commitBooths(next);
  }, [booths, commitBooths, height, selectedIds, width]);

  const nudgeSelected = useCallback(
    (dx: number, dy: number) => {
      if (selectedIds.length === 0) return;
      const selectedIdSet = new Set(selectedIds);
      const next = booths.map((booth) => {
        if (!selectedIdSet.has(booth.boothId)) return booth;
        return {
          ...booth,
          x: clamp(booth.x + dx, 0, width - booth.w),
          y: clamp(booth.y + dy, 0, height - booth.h),
        };
      });
      commitBooths(next);
    },
    [booths, commitBooths, height, selectedIds, width]
  );

  const rotateSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const selectedIdSet = new Set(selectedIds);
    const next = booths.map((booth) => {
      if (!selectedIdSet.has(booth.boothId)) return booth;
      const centerX = booth.x + booth.w / 2;
      const centerY = booth.y + booth.h / 2;
      const rotatedW = booth.h;
      const rotatedH = booth.w;
      const x = clamp(snap(centerX - rotatedW / 2), 0, width - rotatedW);
      const y = clamp(snap(centerY - rotatedH / 2), 0, height - rotatedH);
      return { ...booth, x, y, w: rotatedW, h: rotatedH };
    });
    commitBooths(next);
  }, [booths, commitBooths, height, selectedIds, width]);

  const autoAssignByCategory = () => {
    const assignedSlugs = new Set(
      booths.filter((booth) => booth.vendorSlug).map((booth) => booth.vendorSlug)
    );
    const availableByCategory = new Map<string, Vendor[]>();
    const availableAny: Vendor[] = [];

    vendors.forEach((vendor) => {
      if (assignedSlugs.has(vendor.slug)) return;
      availableAny.push(vendor);
      const categoryList = availableByCategory.get(vendor.category) || [];
      categoryList.push(vendor);
      availableByCategory.set(vendor.category, categoryList);
    });

    const used = new Set<string>();
    const next = booths.map((booth) => {
      if (booth.vendorSlug) return booth;

      const pastMatch = availableAny.find((vendor) => {
        const previous = pastLayoutByVendorSlug.get(vendor.slug);
        return (
          !used.has(vendor.slug) &&
          !!previous &&
          previous.boothId === booth.boothId
        );
      });
      const inCategory = (availableByCategory.get(booth.category) || []).find(
        (vendor) => !used.has(vendor.slug)
      );
      const fallback = availableAny.find((vendor) => !used.has(vendor.slug));
      const vendor = pastMatch || inCategory || fallback;
      if (!vendor) return booth;

      used.add(vendor.slug);
      return {
        ...booth,
        vendorId: vendor.objectId,
        vendorSlug: vendor.slug,
        vendorName: vendor.name,
        category: vendor.category || booth.category,
      };
    });

    commitBooths(next);
  };

  const clearVendor = (boothId: string) => {
    const next = booths.map((booth) =>
      booth.boothId === boothId
        ? {
            ...booth,
            vendorId: "",
            vendorSlug: "",
            vendorName: "Empty booth",
            category: "default",
          }
        : booth
    );
    commitBooths(next);
  };

  const assignVendor = (boothId: string, vendor: Vendor) => {
    const next = booths.map((booth) => {
      if (booth.boothId === boothId) {
        return {
          ...booth,
          vendorId: vendor.objectId,
          vendorSlug: vendor.slug,
          vendorName: vendor.name,
          category: vendor.category,
        };
      }
      return booth;
    });

    commitBooths(next);

    if (quickAssignMode) {
      const nextEmpty = getNextEmptyBooth(boothId);
      setAssigningTo(nextEmpty);
      if (!nextEmpty) setQuickAssignMode(false);
    } else {
      setAssigningTo(null);
    }
    setVendorSearch("");
  };

  const getDragSnapGuides = (
    movingBoothId: string,
    proposed: { x: number; y: number; w: number; h: number }
  ) => {
    const THRESHOLD = 8;
    const others = booths.filter((booth) => booth.boothId !== movingBoothId);
    if (others.length === 0) {
      return { x: proposed.x, y: proposed.y, guides: { vertical: [], horizontal: [] } };
    }

    const verticalLines = others.flatMap((booth) => [
      booth.x,
      booth.x + booth.w / 2,
      booth.x + booth.w,
    ]);
    const horizontalLines = others.flatMap((booth) => [
      booth.y,
      booth.y + booth.h / 2,
      booth.y + booth.h,
    ]);

    const movingXCandidates = [proposed.x, proposed.x + proposed.w / 2, proposed.x + proposed.w];
    const movingYCandidates = [proposed.y, proposed.y + proposed.h / 2, proposed.y + proposed.h];

    let xAdjust = 0;
    let yAdjust = 0;
    let bestX = Number.POSITIVE_INFINITY;
    let bestY = Number.POSITIVE_INFINITY;
    const guide = { vertical: [] as number[], horizontal: [] as number[] };

    movingXCandidates.forEach((candidate) => {
      verticalLines.forEach((line) => {
        const diff = line - candidate;
        if (Math.abs(diff) < bestX && Math.abs(diff) <= THRESHOLD) {
          bestX = Math.abs(diff);
          xAdjust = diff;
          guide.vertical = [line];
        }
      });
    });

    movingYCandidates.forEach((candidate) => {
      horizontalLines.forEach((line) => {
        const diff = line - candidate;
        if (Math.abs(diff) < bestY && Math.abs(diff) <= THRESHOLD) {
          bestY = Math.abs(diff);
          yAdjust = diff;
          guide.horizontal = [line];
        }
      });
    });

    return {
      x: proposed.x + xAdjust,
      y: proposed.y + yAdjust,
      guides: guide,
    };
  };

  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    if (
      e.target !== svgRef.current &&
      !((e.target as SVGElement).tagName === "rect" &&
        (e.target as SVGElement).dataset.bg)
    ) {
      return;
    }

    const point = getSVGPoint(e);
    setContextMenu(null);
    setGuides({ vertical: [], horizontal: [] });
    interactionDirtyRef.current = false;

    if (tool === "draw") {
      setDrawing({ start: point, current: point });
      setSelectedIds([]);
      return;
    }

    setBoxSelecting({
      start: point,
      current: point,
      additive: e.shiftKey,
    });
    if (!e.shiftKey) setSelectedIds([]);
  };

  const getResizedRect = (
    rect: { x: number; y: number; w: number; h: number },
    handle: ResizeHandle,
    dx: number,
    dy: number
  ) => {
    let { x, y, w, h } = rect;

    if (handle.includes("e")) w += dx;
    if (handle.includes("s")) h += dy;
    if (handle.includes("w")) {
      x += dx;
      w -= dx;
    }
    if (handle.includes("n")) {
      y += dy;
      h -= dy;
    }

    if (w < MIN_SIZE) {
      if (handle.includes("w")) x -= MIN_SIZE - w;
      w = MIN_SIZE;
    }
    if (h < MIN_SIZE) {
      if (handle.includes("n")) y -= MIN_SIZE - h;
      h = MIN_SIZE;
    }

    x = clamp(snap(x), 0, width - MIN_SIZE);
    y = clamp(snap(y), 0, height - MIN_SIZE);
    w = clamp(snap(w), MIN_SIZE, width - x);
    h = clamp(snap(h), MIN_SIZE, height - y);

    return { x, y, w, h };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (drawing) {
      const current = getSVGPoint(e);
      setDrawing((prev) => (prev ? { ...prev, current } : null));
      return;
    }

    if (boxSelecting) {
      const current = getSVGPoint(e);
      setBoxSelecting((prev) => (prev ? { ...prev, current } : null));
      return;
    }

    if (dragging) {
      const current = getSVGPoint(e);
      const dx = snap(current.x - dragging.startPoint.x);
      const dy = snap(current.y - dragging.startPoint.y);
      const next = booths.map((booth) => {
        const start = dragging.startRects[booth.boothId];
        if (!start) return booth;

        let x = clamp(start.x + dx, 0, width - booth.w);
        let y = clamp(start.y + dy, 0, height - booth.h);
        if (dragging.ids.length === 1) {
          const snapResult = getDragSnapGuides(booth.boothId, {
            x,
            y,
            w: booth.w,
            h: booth.h,
          });
          x = clamp(snapResult.x, 0, width - booth.w);
          y = clamp(snapResult.y, 0, height - booth.h);
          setGuides(snapResult.guides);
        }
        return { ...booth, x, y };
      });

      interactionDirtyRef.current = true;
      setBooths(next);
      return;
    }

    if (resizing) {
      const current = getSVGPoint(e);
      const dx = snap(current.x - resizing.startPoint.x);
      const dy = snap(current.y - resizing.startPoint.y);
      const next = booths.map((booth) => {
        if (booth.boothId !== resizing.boothId) return booth;
        return {
          ...booth,
          ...getResizedRect(resizing.startRect, resizing.handle, dx, dy),
        };
      });
      interactionDirtyRef.current = true;
      setBooths(next);
    }
  };

  const handleMouseUp = () => {
    if (drawing) {
      const rect = normalizeSelectionRect(drawing.start, drawing.current);
      const finalW = snap(rect.w);
      const finalH = snap(rect.h);
      if (finalW >= MIN_SIZE && finalH >= MIN_SIZE) {
        const newBooth: BoothPosition = {
          boothId: `B${nextIdRef.current++}`,
          vendorSlug: "",
          vendorName: "Empty booth",
          category: "default",
          x: clamp(snap(rect.x), 0, width - finalW),
          y: clamp(snap(rect.y), 0, height - finalH),
          w: finalW,
          h: finalH,
        };
        const next = [...booths, newBooth];
        setSelectedIds([newBooth.boothId]);
        setAssigningTo(newBooth.boothId);
        setQuickAssignMode(false);
        commitBooths(next);
      }
      setDrawing(null);
      return;
    }

    if (boxSelecting) {
      const rect = normalizeSelectionRect(boxSelecting.start, boxSelecting.current);
      const inside = booths
        .filter((booth) => intersectsRect(rect, booth))
        .map((booth) => booth.boothId);
      setSelectedIds((prev) =>
        boxSelecting!.additive ? Array.from(new Set([...prev, ...inside])) : inside
      );
      setBoxSelecting(null);
      return;
    }

    if (dragging || resizing) {
      if (interactionDirtyRef.current) {
        commitBooths(booths);
      }
    }

    setDragging(null);
    setResizing(null);
    setGuides({ vertical: [], horizontal: [] });
    interactionDirtyRef.current = false;
  };

  const handleBoothMouseDown = (e: React.MouseEvent, booth: BoothPosition) => {
    if (tool !== "select") return;
    if (e.button !== 0) return;
    e.stopPropagation();
    setContextMenu(null);
    interactionDirtyRef.current = false;
    const point = getSVGPoint(e);

    if (e.shiftKey) {
      setSelectedIds((prev) =>
        prev.includes(booth.boothId)
          ? prev.filter((id) => id !== booth.boothId)
          : [...prev, booth.boothId]
      );
      return;
    }

    const activeIds = selectedSet.has(booth.boothId) ? selectedIds : [booth.boothId];
    setSelectedIds(activeIds);
    const startRects = Object.fromEntries(
      booths
        .filter((item) => activeIds.includes(item.boothId))
        .map((item) => [
          item.boothId,
          { x: item.x, y: item.y, w: item.w, h: item.h },
        ])
    );

    setDragging({
      ids: activeIds,
      startPoint: point,
      startRects,
    });
  };

  const handleBoothClick = (e: React.MouseEvent, boothId: string) => {
    e.stopPropagation();
    if (tool !== "select" || dragging || resizing) return;
    if (e.shiftKey) {
      setSelectedIds((prev) =>
        prev.includes(boothId) ? prev.filter((id) => id !== boothId) : [...prev, boothId]
      );
    } else {
      setSelectedIds([boothId]);
    }
  };

  const openContextMenu = (e: React.MouseEvent, boothId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedSet.has(boothId)) setSelectedIds([boothId]);
    setContextMenu({ x: e.clientX, y: e.clientY, boothId });
  };

  const startResize = (e: React.MouseEvent, boothId: string, handle: ResizeHandle) => {
    if (tool !== "select") return;
    e.preventDefault();
    e.stopPropagation();
    const booth = booths.find((item) => item.boothId === boothId);
    if (!booth) return;
    const point = getSVGPoint(e);
    setSelectedIds([boothId]);
    interactionDirtyRef.current = false;
    setResizing({
      boothId,
      handle,
      startPoint: point,
      startRect: { x: booth.x, y: booth.y, w: booth.w, h: booth.h },
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
        return;
      }

      if (isTyping) return;

      if (event.key === "/") {
        event.preventDefault();
        beginQuickAssign();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
        return;
      }

      if (event.key === "Escape") {
        setSelectedIds([]);
        setAssigningTo(null);
        setQuickAssignMode(false);
        setContextMenu(null);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        nudgeSelected(event.shiftKey ? -20 : -5, 0);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        nudgeSelected(event.shiftKey ? 20 : 5, 0);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        nudgeSelected(0, event.shiftKey ? -20 : -5);
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        nudgeSelected(0, event.shiftKey ? 20 : 5);
      }

      if (event.key === "+" || event.key === "=") {
        setZoomBy(0.1);
      }
      if (event.key === "-") {
        setZoomBy(-0.1);
      }
      if (event.key === "0") {
        fitToViewport();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    beginQuickAssign,
    deleteSelected,
    duplicateSelected,
    fitToViewport,
    nudgeSelected,
    redo,
    undo,
  ]);

  const selectedBoothForPanel =
    selectedIds.length === 1
      ? booths.find((booth) => booth.boothId === selectedIds[0]) || null
      : null;

  const selectionRect =
    boxSelecting &&
    normalizeSelectionRect(boxSelecting.start, boxSelecting.current);

  const handlePoints =
    primarySelectedBooth && tool === "select"
      ? [
          {
            key: "nw" as ResizeHandle,
            x: primarySelectedBooth.x,
            y: primarySelectedBooth.y,
            cursor: "nwse-resize",
          },
          {
            key: "n" as ResizeHandle,
            x: primarySelectedBooth.x + primarySelectedBooth.w / 2,
            y: primarySelectedBooth.y,
            cursor: "ns-resize",
          },
          {
            key: "ne" as ResizeHandle,
            x: primarySelectedBooth.x + primarySelectedBooth.w,
            y: primarySelectedBooth.y,
            cursor: "nesw-resize",
          },
          {
            key: "e" as ResizeHandle,
            x: primarySelectedBooth.x + primarySelectedBooth.w,
            y: primarySelectedBooth.y + primarySelectedBooth.h / 2,
            cursor: "ew-resize",
          },
          {
            key: "se" as ResizeHandle,
            x: primarySelectedBooth.x + primarySelectedBooth.w,
            y: primarySelectedBooth.y + primarySelectedBooth.h,
            cursor: "nwse-resize",
          },
          {
            key: "s" as ResizeHandle,
            x: primarySelectedBooth.x + primarySelectedBooth.w / 2,
            y: primarySelectedBooth.y + primarySelectedBooth.h,
            cursor: "ns-resize",
          },
          {
            key: "sw" as ResizeHandle,
            x: primarySelectedBooth.x,
            y: primarySelectedBooth.y + primarySelectedBooth.h,
            cursor: "nesw-resize",
          },
          {
            key: "w" as ResizeHandle,
            x: primarySelectedBooth.x,
            y: primarySelectedBooth.y + primarySelectedBooth.h / 2,
            cursor: "ew-resize",
          },
        ]
      : [];

  return (
    <div
      ref={shellRef}
      className={`admin-map-shell ${isFullscreen ? "is-fullscreen" : ""}`}
      style={{ display: "flex", gap: 16, alignItems: "flex-start", position: "relative" }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 10,
            alignItems: "center",
            flexWrap: "wrap",
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
              color: tool === "draw" ? "var(--forest)" : "var(--text-secondary)",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
              fontWeight: tool === "draw" ? 600 : 500,
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
              fontWeight: tool === "select" ? 600 : 500,
            }}
          >
            Select / move
          </button>
          <button
            onClick={() => beginQuickAssign()}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: "1px solid var(--cream-dark)",
              background: quickAssignMode ? "var(--sage-pale)" : "var(--white)",
              color: "var(--text-secondary)",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Assign next empty
          </button>
          <button
            onClick={autoAssignByCategory}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: "1px solid var(--cream-dark)",
              background: "var(--white)",
              color: "var(--text-secondary)",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Smart auto-assign
          </button>
          {selectedIds.length > 0 && (
            <>
              <button
                onClick={duplicateSelected}
                style={{
                  padding: "7px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--cream-dark)",
                  background: "var(--white)",
                  color: "var(--text-secondary)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                Duplicate
              </button>
              <button
                onClick={rotateSelected}
                style={{
                  padding: "7px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--cream-dark)",
                  background: "var(--white)",
                  color: "var(--text-secondary)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                Rotate
              </button>
            </>
          )}

          <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>
            {booths.length} booths · {booths.filter((booth) => booth.vendorSlug).length} assigned
          </span>
          {overlapIds.size > 0 && (
            <span
              className="badge badge-amber"
              style={{ fontSize: 11 }}
            >
              {overlapIds.size} overlapping
            </span>
          )}

          <button
            onClick={undo}
            disabled={!canUndo}
            style={{
              marginLeft: "auto",
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--cream-dark)",
              background: canUndo ? "var(--white)" : "var(--cream)",
              color: "var(--text-secondary)",
              fontSize: 12,
              cursor: canUndo ? "pointer" : "not-allowed",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--cream-dark)",
              background: canRedo ? "var(--white)" : "var(--cream)",
              color: "var(--text-secondary)",
              fontSize: 12,
              cursor: canRedo ? "pointer" : "not-allowed",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Redo
          </button>
          <button
            onClick={() => setZoomBy(-0.1)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--cream-dark)",
              background: "var(--white)",
              color: "var(--text-secondary)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            -
          </button>
          <button
            onClick={() => setZoomBy(0.1)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--cream-dark)",
              background: "var(--white)",
              color: "var(--text-secondary)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            +
          </button>
          <button
            onClick={fitToViewport}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--cream-dark)",
              background: "var(--white)",
              color: "var(--text-secondary)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Fit
          </button>
          <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 52 }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={toggleFullscreen}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid var(--cream-dark)",
              background: "var(--white)",
              color: "var(--text-secondary)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {isFullscreen ? "Exit full screen" : "Full screen"}
          </button>
          {booths.length > 0 && (
            <button
              onClick={() => {
                setSelectedIds([]);
                setAssigningTo(null);
                setQuickAssignMode(false);
                commitBooths([]);
              }}
              style={{
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
          ref={viewportRef}
          style={{
            borderRadius: 12,
            overflow: "auto",
            border: "1px solid var(--cream-dark)",
            background: "#f9f6f0",
            cursor: tool === "draw" ? "crosshair" : "default",
            maxHeight: isFullscreen ? "calc(100vh - 188px)" : 560,
            minHeight: 260,
            position: "relative",
          }}
        >
          <div
            style={{
              minWidth: "100%",
              minHeight: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: 8,
            }}
          >
            <svg
              ref={svgRef}
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              style={{
                display: "block",
                userSelect: "none",
                width: width * zoom,
                height: height * zoom,
                minWidth: width * zoom,
              }}
              onMouseDown={handleBackgroundMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <rect data-bg="true" width={width} height={height} fill="#f9f6f0" />

              {Array.from({ length: Math.floor(height / SNAP) }).map((_, row) =>
                Array.from({ length: Math.floor(width / SNAP) }).map((__, col) => (
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

              {guides.vertical.map((x) => (
                <line
                  key={`gx-${x}`}
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={height}
                  stroke="#1D9E75"
                  strokeWidth={1}
                  strokeDasharray="5 4"
                  opacity={0.85}
                />
              ))}
              {guides.horizontal.map((y) => (
                <line
                  key={`gy-${y}`}
                  x1={0}
                  y1={y}
                  x2={width}
                  y2={y}
                  stroke="#1D9E75"
                  strokeWidth={1}
                  strokeDasharray="5 4"
                  opacity={0.85}
                />
              ))}

              {booths.map((booth) => {
                const isSelected = selectedSet.has(booth.boothId);
                const isOverlapping = overlapIds.has(booth.boothId);
                const col = COLORS[booth.category] ?? COLORS.default;
                const cx = booth.x + booth.w / 2;
                const cy = booth.y + booth.h / 2;

                return (
                  <g
                    key={booth.boothId}
                    style={{
                      cursor: tool === "select" ? "move" : "pointer",
                    }}
                    onClick={(e) => handleBoothClick(e, booth.boothId)}
                    onMouseDown={(e) => handleBoothMouseDown(e, booth)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setAssigningTo(booth.boothId);
                      setQuickAssignMode(false);
                      setSelectedIds([booth.boothId]);
                    }}
                    onContextMenu={(e) => openContextMenu(e, booth.boothId)}
                  >
                    <rect
                      x={booth.x}
                      y={booth.y}
                      width={booth.w}
                      height={booth.h}
                      rx={6}
                      fill={col.fill}
                      stroke={
                        isOverlapping
                          ? "#d33f3f"
                          : isSelected
                          ? "#1D9E75"
                          : col.stroke
                      }
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                    <text
                      x={booth.x + 5}
                      y={booth.y + 11}
                      fill={isOverlapping ? "#9f2020" : col.stroke}
                      fontSize="8"
                      fontFamily="DM Sans, sans-serif"
                      fontWeight="700"
                      opacity="0.75"
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

              {selectionRect && (selectionRect.w > 3 || selectionRect.h > 3) && (
                <rect
                  x={selectionRect.x}
                  y={selectionRect.y}
                  width={selectionRect.w}
                  height={selectionRect.h}
                  fill="rgba(29, 158, 117, 0.12)"
                  stroke="#1D9E75"
                  strokeWidth={1.2}
                  strokeDasharray="4 3"
                />
              )}

              {drawing && (
                (() => {
                  const rect = normalizeSelectionRect(drawing.start, drawing.current);
                  return (
                    <rect
                      x={rect.x}
                      y={rect.y}
                      width={rect.w}
                      height={rect.h}
                      rx={6}
                      fill="rgba(45,90,61,0.08)"
                      stroke="#2d5a3d"
                      strokeWidth="1.5"
                      strokeDasharray="5 4"
                    />
                  );
                })()
              )}

              {handlePoints.map((handle) => (
                <rect
                  key={handle.key}
                  x={handle.x - 4}
                  y={handle.y - 4}
                  width={8}
                  height={8}
                  rx={2}
                  fill="#1D9E75"
                  stroke="white"
                  strokeWidth={1}
                  style={{ cursor: handle.cursor }}
                  onMouseDown={(e) => startResize(e, primarySelectedId!, handle.key)}
                />
              ))}
            </svg>
          </div>
        </div>

        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
          {tool === "draw"
            ? "Draw: click + drag. Select: click, Shift-click for multi-select, drag to move, resize with handles, right-click for quick actions."
            : "Shortcuts: Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z redo, arrows nudge (Shift=20), / opens quick assign, Delete removes selected."}
        </div>
      </div>

      <div style={{ width: isFullscreen ? 280 : 240, flexShrink: 0 }}>
        {isFullscreen && (
          <div
            style={{
              background: "var(--white)",
              border: "1px solid var(--cream-dark)",
              borderRadius: 12,
              padding: 10,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-muted)",
                marginBottom: 8,
              }}
            >
              Navigator
            </div>
            <svg width={190} height={124} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", width: "100%" }}>
              <rect width={width} height={height} fill="#f9f6f0" stroke="#d8d0c4" />
              {booths.map((booth) => (
                <rect
                  key={`mini-${booth.boothId}`}
                  x={booth.x}
                  y={booth.y}
                  width={booth.w}
                  height={booth.h}
                  fill={selectedSet.has(booth.boothId) ? "#1D9E75" : "#a7c5b5"}
                  opacity={0.75}
                />
              ))}
              <rect
                x={viewportRect.x}
                y={viewportRect.y}
                width={viewportRect.w}
                height={viewportRect.h}
                fill="none"
                stroke="#1a3a2a"
                strokeWidth={2}
              />
            </svg>
          </div>
        )}

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
                  fontWeight: 600,
                  color: "var(--forest)",
                }}
              >
                {quickAssignMode ? "Quick assign" : "Assign vendor"} · {assigningTo}
              </span>
              <button
                onClick={() => {
                  setAssigningTo(null);
                  setQuickAssignMode(false);
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
                onChange={(event) => setVendorSearch(event.target.value)}
                placeholder="Search vendors..."
                autoFocus
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 7,
                  border: "1px solid var(--cream-dark)",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "DM Sans, sans-serif",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {booths.find((booth) => booth.boothId === assigningTo)?.vendorSlug && (
                <div
                  onClick={() => clearVendor(assigningTo)}
                  style={{
                    padding: "8px 14px",
                    cursor: "pointer",
                    fontSize: 12,
                    color: "#c62828",
                    borderBottom: "1px solid var(--cream-dark)",
                  }}
                >
                  Clear current vendor
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
                assignableVendors.map((vendor) => {
                  const currentBooths = vendorAssignedBooths.get(vendor.slug) || [];
                  const assignedElsewhere = currentBooths.some(
                    (boothId) => boothId !== assigningTo
                  );
                  const previous = pastLayoutByVendorSlug.get(vendor.slug);
                  const suggestionHint =
                    previous && assigningTo && previous.boothId === assigningTo
                      ? "Previously in this booth"
                      : previous
                      ? `Previously in ${previous.boothId}`
                      : "";
                  return (
                    <div
                      key={vendor.slug}
                      onClick={() => assignVendor(assigningTo, vendor)}
                      style={{
                        padding: "9px 14px",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--cream-dark)",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.background = "#f1efea";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.background = "white";
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {vendor.name}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: assignedElsewhere ? "#a45818" : "var(--text-muted)",
                        }}
                      >
                        {vendor.subcategory || vendor.category}
                        {assignedElsewhere
                          ? ` · currently at ${currentBooths.join(", ")}`
                          : currentBooths.includes(assigningTo || "")
                          ? " · currently here"
                          : ""}
                        {suggestionHint ? ` · ${suggestionHint}` : ""}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : selectedBoothForPanel ? (
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
              Booth {selectedBoothForPanel.boothId}
            </div>
            <div
              style={{
                fontFamily: "Playfair Display, serif",
                fontSize: 15,
                color: "var(--forest)",
                marginBottom: 4,
              }}
            >
              {selectedBoothForPanel.vendorSlug
                ? selectedBoothForPanel.vendorName
                : "Unassigned"}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                marginBottom: 14,
              }}
            >
              {selectedBoothForPanel.w} × {selectedBoothForPanel.h}px
              {overlapIds.has(selectedBoothForPanel.boothId) && " · overlaps another booth"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => {
                  setAssigningTo(selectedBoothForPanel.boothId);
                  setQuickAssignMode(false);
                }}
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
                {selectedBoothForPanel.vendorSlug ? "Reassign vendor" : "Assign vendor"}
              </button>
              {selectedBoothForPanel.vendorSlug && (
                <button
                  onClick={() => clearVendor(selectedBoothForPanel.boothId)}
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
                onClick={deleteSelected}
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
                fontWeight: 600,
                color: "var(--forest)",
                marginBottom: 8,
              }}
            >
              Workflow upgrades
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.7,
              }}
            >
              <div style={{ marginBottom: 6 }}>1. Draw booths, then switch to select mode.</div>
              <div style={{ marginBottom: 6 }}>
                2. Shift-click for multi-select and drag to move a whole cluster.
              </div>
              <div style={{ marginBottom: 6 }}>
                3. Resize from handles and watch overlap warnings.
              </div>
              <div style={{ marginBottom: 6 }}>
                4. Press <strong>/</strong> for quick assign flow.
              </div>
              <div>5. Use Undo/Redo and zoom + fit for faster iteration.</div>
            </div>
          </div>
        )}
      </div>

      {contextMenu && (
        <div
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 1200,
            background: "white",
            border: "1px solid var(--cream-dark)",
            borderRadius: 10,
            boxShadow: "0 10px 28px rgba(26,58,42,0.18)",
            minWidth: 168,
            overflow: "hidden",
          }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            onClick={() => {
              setAssigningTo(contextMenu.boothId);
              setQuickAssignMode(false);
              setContextMenu(null);
            }}
            style={menuItemStyle}
          >
            Assign vendor
          </button>
          <button
            onClick={() => {
              setSelectedIds([contextMenu.boothId]);
              duplicateSelected();
              setContextMenu(null);
            }}
            style={menuItemStyle}
          >
            Duplicate booth
          </button>
          <button
            onClick={() => {
              setSelectedIds([contextMenu.boothId]);
              deleteSelected();
              setContextMenu(null);
            }}
            style={{ ...menuItemStyle, color: "#b42318" }}
          >
            Delete booth
          </button>
        </div>
      )}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  background: "white",
  border: "none",
  borderBottom: "1px solid var(--cream-dark)",
  padding: "10px 12px",
  cursor: "pointer",
  fontSize: 12.5,
  color: "var(--text-secondary)",
  fontFamily: "DM Sans, sans-serif",
};
