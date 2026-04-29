import React, { useState, useEffect } from "react";
import { useVendors } from "../../hooks/useVendors";
import { MarketEvent, useMarketEvents } from "../../hooks/useMarketEvents";
import Parse from "../../lib/parse";
import AdminMapEditor from "./AdminMapEditor";
import { BoothPosition } from "../consumer/MarketMap";
import {
  EventWorkflowStatus,
  formatEventDate,
  getWorkflowTransitionIssues,
  isUpcomingDate,
  parseBoothMap,
  serializeBoothMap,
  toDateInputValue,
  validateEventForWorkflow,
} from "../../lib/marketEvents";

interface Props {
  onClose: () => void;
  onSaved: () => void;
  event?: MarketEvent; // if provided, we're editing
}

type Step = "details" | "vendors" | "booths";
const STEP_ORDER: Step[] = ["details", "vendors", "booths"];
const STEP_LABELS: Record<Step, string> = {
  details: "Details",
  vendors: "Vendors",
  booths: "Booths",
};
const STEP_HELP: Record<Step, string> = {
  details: "Set the event basics first.",
  vendors: "Pick who is participating.",
  booths: "Assign vendors to booths (partial assignment is allowed).",
};
const HOURS_PRESETS = [
  "8:00 AM – 12:00 PM",
  "9:00 AM – 1:00 PM",
  "10:00 AM – 3:00 PM",
  "11:00 AM – 4:00 PM",
];

const DEFAULT_EVENT_ADDRESS = "1105 Northside Blvd, South Bend, IN 46615";
const WORKFLOW_LABELS: Record<EventWorkflowStatus, string> = {
  draft: "Draft",
  review: "In Review",
  published: "Published",
};

export default function AddEventModal({
  onClose,
  onSaved,
  event: editEvent,
}: Props) {
  const { vendors } = useVendors();
  const { events: allEvents } = useMarketEvents();
  const isEditing = !!editEvent;
  const mapDraftStorageKey = `marketflow:booth-map-draft:${
    editEvent?.objectId ?? "new-event"
  }`;

  const readBoothMapDraft = () => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(mapDraftStorageKey);
      if (!raw) return null;
      return parseBoothMap(JSON.parse(raw));
    } catch {
      return null;
    }
  };

  const [step, setStep] = useState<Step>("details");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state — pre-fill if editing
  const [name, setName] = useState(editEvent?.name ?? "");
  const [date, setDate] = useState(toDateInputValue(editEvent?.date));
  const [endDate, setEndDate] = useState(toDateInputValue(editEvent?.endDate));
  const [hours, setHours] = useState(editEvent?.hours ?? "10:00 AM – 3:00 PM");
  const [notes, setNotes] = useState(editEvent?.notes ?? "");
  const [address, setAddress] = useState(editEvent?.address ?? DEFAULT_EVENT_ADDRESS);
  const [workflowStatus, setWorkflowStatus] = useState<EventWorkflowStatus>(
    editEvent?.workflowStatus ?? (editEvent?.isPublished ? "published" : "draft")
  );
  const [showPublishIssues, setShowPublishIssues] = useState(false);
  const [selectedVendorSlugs, setSelectedVendorSlugs] = useState<Set<string>>(
    new Set()
  );
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorCategoryFilter, setVendorCategoryFilter] = useState("All");
  const [boothMap, setBoothMap] = useState<BoothPosition[]>(
    () => readBoothMapDraft() ?? parseBoothMap(editEvent?.boothMap)
  );

  // Load existing vendor relations when editing
  useEffect(() => {
    if (!editEvent) return;
    // Re-parse boothMap from the live event in case it updated; prefer draft if available.
    setBoothMap(readBoothMapDraft() ?? parseBoothMap(editEvent.boothMap));
    const loadVendors = async () => {
      try {
        const query = new Parse.Query("MarketEvent");
        const obj = await query.get(editEvent.objectId);
        const relation = obj.relation("vendors");
        const results = await relation.query().limit(200).find();
        setSelectedVendorSlugs(new Set(results.map((v: any) => v.get("slug"))));
      } catch (e) {
        // silently fail — vendor selection just starts empty
      }
    };
    loadVendors();
  }, [editEvent]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(mapDraftStorageKey, JSON.stringify(boothMap));
    } catch {
      // Ignore localStorage failures; map editing should still continue.
    }
  }, [boothMap, mapDraftStorageKey]);

  const VENDOR_CATEGORIES = [
    "All",
    "Farmers, Fishers, Foragers",
    "Food & Beverage Producers",
    "Prepared Food",
  ];

  const filteredVendors = vendors.filter((v) => {
    const matchCat =
      vendorCategoryFilter === "All" || v.category === vendorCategoryFilter;
    const matchSearch = v.name
      .toLowerCase()
      .includes(vendorSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  const selectAll = () => {
    setSelectedVendorSlugs(
      (prev) => new Set([...Array.from(prev), ...filteredVendors.map((v) => v.slug)])
    );
  };

  const deselectAll = () => {
    const filteredSlugs = new Set(filteredVendors.map((v) => v.slug));
    setSelectedVendorSlugs(
      (prev) => new Set(Array.from(prev).filter((s) => !filteredSlugs.has(s)))
    );
  };

  const eventDateForLayout = date ? new Date(date) : null;
  const layoutReferenceDate =
    eventDateForLayout && !Number.isNaN(eventDateForLayout.getTime())
      ? eventDateForLayout
      : new Date();
  const historicalEvents = allEvents
    .filter((event) => event.objectId !== editEvent?.objectId)
    .filter((event) => new Date(event.date).getTime() < layoutReferenceDate.getTime())
    .filter((event) => event.boothMap.length > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latestLayoutEvent = historicalEvents[0] ?? null;

  const pastLayoutByVendor = new Map<string, { boothId: string; category: string }>();
  historicalEvents.forEach((event) => {
    event.boothMap.forEach((booth) => {
      const slug = (booth.vendorSlug || "").trim();
      if (!slug || pastLayoutByVendor.has(slug)) return;
      pastLayoutByVendor.set(slug, {
        boothId: booth.boothId,
        category: booth.category || "default",
      });
    });
  });

  const copyFromLastEvent = () => {
    const previous = latestLayoutEvent;
    if (!previous) {
      setSelectedVendorSlugs(new Set(vendors.map((v) => v.slug)));
      return;
    }

    const previousVendorSlugs = previous.boothMap
      .map((booth) => (booth.vendorSlug || "").trim())
      .filter(Boolean);
    setSelectedVendorSlugs(new Set(previousVendorSlugs));
    setBoothMap(previous.boothMap.map((booth) => ({ ...booth })));
  };

  const toggleVendor = (slug: string) => {
    setSelectedVendorSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
        setBoothMap((current) => current.filter((b) => b.vendorSlug !== slug));
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const validateDetails = () => {
    if (!name.trim()) return "Event name is required";
    if (!date) return "Event date is required";
    if (!hours.trim()) return "Market hours are required";
    if (!address.trim()) return "Event address is required";
    return null;
  };
  const endDateError =
    date && endDate && endDate < date
      ? "End date cannot be earlier than start date."
      : null;
  const detailError = validateDetails();
  const canContinueDetails = !detailError && !endDateError;
  const currentStepIndex = STEP_ORDER.indexOf(step);
  const workflowValidation = validateEventForWorkflow({
    name,
    date,
    hours,
    address,
    selectedVendorSlugs: Array.from(selectedVendorSlugs),
    boothMap,
  });

  const handleNext = () => {
    if (step === "details") {
      if (!canContinueDetails) {
        setError(detailError || endDateError || "Please complete required fields.");
        return;
      }
      setError("");
      setStep("vendors");
    } else if (step === "vendors") {
      if (selectedVendorSlugs.size === 0) {
        setError("Select at least one vendor before assigning booths.");
        return;
      }
      setError("");
      setStep("booths");
    }
  };

  const handleSave = async (targetStatus?: EventWorkflowStatus) => {
    const desiredStatus = targetStatus || workflowStatus;
    const shouldPublish = desiredStatus === "published";
    const shouldSubmitForReview = desiredStatus === "review";
    const transitionIssues = getWorkflowTransitionIssues(
      workflowStatus,
      desiredStatus,
      workflowValidation
    );

    if (transitionIssues.length > 0) {
      setError(
        shouldSubmitForReview
          ? "Complete required details and vendor selection before sending to review."
          : shouldPublish
          ? transitionIssues[0]
          : transitionIssues.join(" ")
      );
      setShowPublishIssues(true);
      return;
    }

    setSaving(true);
    setError("");
    try {
      let obj: Parse.Object;
      let previousBoothMap: BoothPosition[] = [];
      let previousVendorSlugs: string[] = [];

      if (isEditing) {
        const q = new Parse.Query("MarketEvent");
        obj = await q.get(editEvent.objectId);
        previousBoothMap = parseBoothMap(obj.get("boothMap"));
        const existingVendors = await obj.relation("vendors").query().limit(200).find();
        previousVendorSlugs = existingVendors
          .map((vendor: any) => String(vendor.get("slug") || "").trim())
          .filter(Boolean);
      } else {
        const MarketEvent = Parse.Object.extend("MarketEvent");
        obj = new MarketEvent();
      }

      obj.set("name", name.trim());
      obj.set("date", new Date(date));
      if (endDate) obj.set("endDate", new Date(endDate));
      if (!endDate) obj.unset("endDate");
      obj.set("hours", hours.trim());
      obj.set("address", address.trim());
      obj.set("notes", notes.trim());
      obj.set("workflowStatus", desiredStatus);
      obj.set("isPublished", shouldPublish);
      obj.set("reviewChecklist", workflowValidation.checklist);
      obj.set(
        "reviewIssues",
        desiredStatus === "published"
          ? workflowValidation.publishIssues
          : workflowValidation.reviewIssues
      );
      obj.set("lastValidatedAt", new Date());
      obj.set("boothMap", serializeBoothMap(boothMap));
      await obj.save();

      // Rebuild vendor relation from scratch
      const relation = obj.relation("vendors");

      if (isEditing) {
        // Remove all existing vendors first
        const existing = await relation.query().limit(200).find();
        if (existing.length > 0) relation.remove(existing);
      }

      if (selectedVendorSlugs.size > 0) {
        const vendorQuery = new Parse.Query("Vendor");
        vendorQuery.containedIn("slug", Array.from(selectedVendorSlugs));
        vendorQuery.limit(200);
        const vendorObjects = await vendorQuery.find();
        relation.add(vendorObjects);
      }

      await obj.save();

      if (isEditing || selectedVendorSlugs.size > 0) {
        await Parse.Cloud.run("notifyVendorAssignmentChanges", {
          eventId: obj.id,
          previousVendorSlugs,
          nextVendorSlugs: Array.from(selectedVendorSlugs),
          previousBoothMap,
          nextBoothMap: boothMap,
          eventName: name.trim(),
          eventDate: date ? new Date(date).toISOString() : null,
          eventAddress: address.trim(),
          marketHours: hours.trim(),
        });
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(mapDraftStorageKey);
      }
      setWorkflowStatus(desiredStatus);
      onSaved();
    } catch (e: any) {
      setError(e.message || "Failed to save event");
    } finally {
      setSaving(false);
    }
  };

  const selectedVendors = vendors.filter((v) =>
    selectedVendorSlugs.has(v.slug)
  );

  return (
    <div
      style={s.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <h2 style={s.title}>
            {isEditing ? `Edit: ${editEvent.name}` : "Add Market Event"}
          </h2>
          <button onClick={onClose} style={s.closeBtn}>
            ✕
          </button>
        </div>

        {/* Steps */}
        <div style={s.steps}>
          {STEP_ORDER.map((st, i) => {
            const isDone = i < currentStepIndex;
            const isCurrent = step === st;
            const canJump = i <= currentStepIndex;
            return (
              <div
                key={st}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <div
                  style={{
                    ...s.stepDot,
                    background: isCurrent
                      ? "var(--forest-mid)"
                      : isDone
                      ? "var(--forest-light)"
                      : "var(--cream-dark)",
                    color: isCurrent || isDone ? "white" : "var(--text-muted)",
                    cursor: canJump ? "pointer" : "default",
                  }}
                  onClick={() => canJump && setStep(st)}
                >
                  {isDone ? "✓" : i + 1}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    color: isCurrent ? "var(--forest)" : "var(--text-muted)",
                    fontWeight: isCurrent ? 500 : 400,
                    textTransform: "capitalize",
                    cursor: canJump ? "pointer" : "default",
                  }}
                  onClick={() => canJump && setStep(st)}
                >
                  {STEP_LABELS[st]}
                </span>
                {i < 2 && (
                  <span style={{ color: "var(--cream-dark)", margin: "0 4px" }}>
                    ›
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div style={s.body}>
          {error && <div style={s.error}>{error}</div>}
          <div style={s.workflowPanel}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={s.workflowTitle}>Publishing Workflow</div>
                <div style={s.workflowSub}>
                  Current status:{" "}
                  <strong>{WORKFLOW_LABELS[workflowStatus]}</strong>
                </div>
              </div>
              <span
                className={`badge ${
                  workflowStatus === "published"
                    ? "badge-green"
                    : workflowStatus === "review"
                    ? "badge-amber"
                    : "badge-gray"
                }`}
              >
                {WORKFLOW_LABELS[workflowStatus]}
              </span>
            </div>
            <div style={s.checklistGrid}>
              <div style={s.checkItem}>
                <span>{workflowValidation.checklist.detailsComplete ? "✓" : "•"}</span>
                <span>Details complete</span>
              </div>
              <div style={s.checkItem}>
                <span>{workflowValidation.checklist.hasVendors ? "✓" : "•"}</span>
                <span>Vendors selected</span>
              </div>
              <div style={s.checkItem}>
                <span>{workflowValidation.checklist.hasBooths ? "✓" : "•"}</span>
                <span>Booths created</span>
              </div>
              <div style={s.checkItem}>
                <span>{workflowValidation.checklist.allSelectedVendorsAssigned ? "✓" : "•"}</span>
                <span>All selected vendors assigned (optional)</span>
              </div>
              <div style={s.checkItem}>
                <span>{workflowValidation.checklist.noOverlappingBooths ? "✓" : "•"}</span>
                <span>No booth overlaps</span>
              </div>
            </div>
            {showPublishIssues && workflowValidation.publishIssues.length > 0 && (
              <div style={s.validationList}>
                {workflowValidation.publishIssues.map((issue) => (
                  <div key={issue}>• {issue}</div>
                ))}
              </div>
            )}
          </div>

          {/* Step 1: Details */}
          {step === "details" && (
            <div style={s.fields}>
              <div style={s.stepCallout}>
                <div style={s.stepCalloutTitle}>Step 1 of 3 · Event details</div>
                <div style={s.stepCalloutText}>
                  Name the event, choose date(s), and set the hours customers will see.
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Event name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Opening Day 2026"
                  style={s.input}
                />
                <div style={s.hint}>
                  Use a short name your team and customers will recognize.
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div style={s.field}>
                  <label style={s.label}>Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={s.input}
                  />
                  <div style={s.hint}>Start date for this market event.</div>
                </div>
                <div style={s.field}>
                  <label style={s.label}>
                    End date <span style={s.opt}>(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={s.input}
                  />
                  <div style={s.hint}>Only needed for multi-day events.</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: -6 }}>
                <button
                  type="button"
                  style={s.chipBtn}
                  onClick={() => setEndDate(date)}
                  disabled={!date}
                >
                  Set end date = start date
                </button>
                <button
                  type="button"
                  style={s.chipBtn}
                  onClick={() => setEndDate("")}
                >
                  Clear end date
                </button>
              </div>
              <div style={s.field}>
                <label style={s.label}>Market hours *</label>
                <input
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="10:00 AM – 3:00 PM"
                  style={s.input}
                />
                <div style={s.hint}>Format: 10:00 AM - 3:00 PM</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                  {HOURS_PRESETS.map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setHours(preset)}
                      style={{
                        ...s.chipBtn,
                        borderColor: hours === preset ? "var(--forest-mid)" : "var(--cream-dark)",
                        background: hours === preset ? "var(--sage-pale)" : "var(--white)",
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Address *</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="1105 Northside Blvd, South Bend, IN 46615"
                  style={s.input}
                />
                <div style={s.hint}>This appears on customer and vendor event views.</div>
              </div>
              <div style={s.field}>
                <label style={s.label}>
                  Notes <span style={s.opt}>(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special notes for this market day..."
                  rows={3}
                  style={{ ...s.input, resize: "vertical" }}
                />
              </div>
              {endDateError && <div style={s.error}>{endDateError}</div>}
            </div>
          )}

          {/* Step 2: Vendors */}
          {step === "vendors" && (
            <div>
              <div style={{ ...s.stepCallout, marginBottom: 14 }}>
                <div style={s.stepCalloutTitle}>Step 2 of 3 · Vendor selection</div>
                <div style={s.stepCalloutText}>
                  Select every vendor participating in this event.
                </div>
                {latestLayoutEvent && (
                  <div style={{ ...s.stepCalloutText, marginTop: 6 }}>
                    Last saved layout: {latestLayoutEvent.name} on{" "}
                    {formatEventDate(latestLayoutEvent.date, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {isUpcomingDate(latestLayoutEvent.date) ? " (upcoming)" : " (past)"}.
                  </div>
                )}
              </div>
              {/* Toolbar */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 14,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <input
                  type="text"
                  placeholder="Search vendors..."
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  style={{
                    ...s.input,
                    flex: 1,
                    minWidth: 160,
                    padding: "7px 12px",
                  }}
                />
                <button
                  onClick={selectAll}
                  style={{
                    ...s.chipBtn,
                    background: "var(--sage-pale)",
                    color: "var(--forest-mid)",
                    borderColor: "var(--sage-light)",
                  }}
                >
                  Select all
                </button>
                <button onClick={deselectAll} style={{ ...s.chipBtn }}>
                  Deselect all
                </button>
                <button onClick={copyFromLastEvent} style={{ ...s.chipBtn }}>
                  Copy from most recent layout
                </button>
              </div>

              {/* Category filters */}
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginBottom: 14,
                  flexWrap: "wrap",
                }}
              >
                {VENDOR_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setVendorCategoryFilter(cat)}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 20,
                      border: "1.5px solid",
                      borderColor:
                        vendorCategoryFilter === cat
                          ? "var(--forest-mid)"
                          : "var(--cream-dark)",
                      background:
                        vendorCategoryFilter === cat
                          ? "var(--forest-mid)"
                          : "var(--white)",
                      color:
                        vendorCategoryFilter === cat
                          ? "white"
                          : "var(--text-secondary)",
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "Nunito, sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    {cat === "Farmers, Fishers, Foragers"
                      ? "Farmers"
                      : cat === "Food & Beverage Producers"
                      ? "Producers"
                      : cat}
                  </button>
                ))}
              </div>

              {/* Count */}
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 12,
                }}
              >
                <strong style={{ color: "var(--forest)" }}>
                  {selectedVendorSlugs.size}
                </strong>{" "}
                of {vendors.length} vendors selected
                {filteredVendors.length !== vendors.length &&
                  ` · showing ${filteredVendors.length}`}
              </p>

              <div style={s.vendorGrid}>
                {filteredVendors.map((v) => {
                  const isSelected = selectedVendorSlugs.has(v.slug);
                  return (
                    <div
                      key={v.slug}
                      onClick={() => toggleVendor(v.slug)}
                      style={{
                        ...s.vendorChip,
                        background: isSelected
                          ? "var(--sage-pale)"
                          : "var(--cream)",
                        borderColor: isSelected
                          ? "var(--forest-mid)"
                          : "var(--cream-dark)",
                        color: isSelected
                          ? "var(--forest)"
                          : "var(--text-secondary)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          marginBottom: 2,
                          display: "block",
                          opacity: 0.55,
                        }}
                      >
                        {v.subcategory ||
                          (v.category === "Farmers, Fishers, Foragers"
                            ? "Farmer"
                            : v.category === "Food & Beverage Producers"
                            ? "Producer"
                            : "Prepared")}
                      </span>
                      <span
                        style={{
                          fontWeight: isSelected ? 600 : 400,
                          fontSize: 13,
                        }}
                      >
                        {v.name}
                      </span>
                      {isSelected && (
                        <span
                          style={{
                            position: "absolute",
                            top: 5,
                            right: 6,
                            fontSize: 11,
                            color: "var(--forest-mid)",
                            fontWeight: 700,
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </div>
                  );
                })}
                {filteredVendors.length === 0 && (
                  <div
                    style={{
                      gridColumn: "1/-1",
                      textAlign: "center",
                      padding: "24px",
                      color: "var(--text-muted)",
                      fontSize: 13,
                    }}
                  >
                    No vendors match your search
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Booth map */}
          {step === "booths" && (
            <div>
              <div style={{ ...s.stepCallout, marginBottom: 14 }}>
                <div style={s.stepCalloutTitle}>Step 3 of 3 · Booth assignment</div>
                <div style={s.stepCalloutText}>
                  Assign only selected vendors to booth spaces, then save.
                </div>
              </div>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  marginBottom: 16,
                }}
              >
                Click a booth to assign vendors. Suggestions are ranked by category fit and past layout.
              </p>
              <AdminMapEditor
                vendors={selectedVendors}
                initialBooths={boothMap}
                pastLayoutByVendorSlug={pastLayoutByVendor}
                onChange={setBoothMap}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={onClose} style={s.cancelBtn} disabled={saving}>
              Cancel
            </button>
            <div style={s.footerMeta}>
              Step {currentStepIndex + 1} of 3 · {STEP_HELP[step]}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {step !== "details" && (
              <button
                onClick={() =>
                  setStep(step === "booths" ? "vendors" : "details")
                }
                style={s.backBtn}
                disabled={saving}
              >
                ← Back
              </button>
            )}
            {step !== "booths" ? (
              <button
                onClick={handleNext}
                style={s.nextBtn}
                disabled={saving || (step === "details" && !canContinueDetails)}
              >
                Next →
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setShowPublishIssues(false);
                    handleSave("draft");
                  }}
                  style={s.backBtn}
                  disabled={saving}
                >
                  {saving && workflowStatus === "draft"
                    ? "Saving..."
                    : "Save Draft"}
                </button>
                <button
                  onClick={() => {
                    setShowPublishIssues(true);
                    handleSave("review");
                  }}
                  style={s.reviewBtn}
                  disabled={saving || !workflowValidation.canSubmitForReview}
                  title={
                    workflowValidation.canSubmitForReview
                      ? "Submit this event for review"
                      : "Complete details and vendor selection first"
                  }
                >
                  Submit for Review
                </button>
                <button
                  onClick={() => {
                    setShowPublishIssues(true);
                    handleSave("published");
                  }}
                  style={s.saveBtn}
                  disabled={saving || !workflowValidation.canPublish || workflowStatus !== "review"}
                  title={
                    workflowStatus !== "review"
                      ? "Submit this event for review before publishing"
                      : workflowValidation.canPublish
                      ? "Publish event to customer and vendor views"
                      : "Resolve workflow checks before publishing"
                  }
                >
                  {saving && workflowStatus === "published"
                    ? "Publishing..."
                    : "Publish Event"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "16px 12px",
  },
  modal: {
    background: "var(--white)",
    borderRadius: 16,
    width: "100%",
    maxWidth: 1100,
    maxHeight: "92vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "24px 28px 16px",
    borderBottom: "1px solid var(--cream-dark)",
  },
  title: {
    fontFamily: "Playfair Display, serif",
    fontSize: 22,
    color: "var(--forest)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
    color: "var(--text-muted)",
    padding: "4px 8px",
  },
  steps: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "16px 28px",
    borderBottom: "1px solid var(--cream-dark)",
    background: "var(--cream)",
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 600,
  },
  body: { flex: 1, overflowY: "auto", padding: "24px 28px" },
  workflowPanel: {
    border: "1px solid var(--cream-dark)",
    borderRadius: 12,
    background: "var(--cream)",
    padding: "12px 14px",
    marginBottom: 16,
  },
  workflowTitle: {
    fontSize: 13,
    color: "var(--forest)",
    fontWeight: 700,
    marginBottom: 2,
  },
  workflowSub: {
    fontSize: 12.5,
    color: "var(--text-secondary)",
  },
  checklistGrid: {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 8,
  },
  checkItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12.5,
    color: "var(--text-secondary)",
  },
  validationList: {
    marginTop: 10,
    fontSize: 12.5,
    color: "#9f2f2f",
    display: "grid",
    gap: 4,
  },
  error: {
    background: "#fff0f0",
    border: "1px solid #ffcdd2",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: "#c62828",
    marginBottom: 16,
  },
  fields: { display: "flex", flexDirection: "column", gap: 18 },
  stepCallout: {
    borderRadius: 10,
    border: "1px solid var(--cream-dark)",
    background: "var(--cream)",
    padding: "10px 12px",
  },
  stepCalloutTitle: {
    fontSize: 13,
    color: "var(--forest)",
    fontWeight: 700,
    marginBottom: 3,
  },
  stepCalloutText: {
    fontSize: 12.5,
    color: "var(--text-secondary)",
  },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: "var(--text-primary)" },
  hint: { fontSize: 12, color: "var(--text-muted)" },
  opt: { fontWeight: 400, color: "var(--text-muted)", fontSize: 12 },
  input: {
    padding: "9px 14px",
    borderRadius: 8,
    border: "1px solid var(--cream-dark)",
    fontSize: 14,
    outline: "none",
    fontFamily: "DM Sans, sans-serif",
    background: "var(--cream)",
    color: "var(--text-primary)",
  },
  vendorGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: 8,
  },
  chipBtn: {
    padding: "6px 13px",
    borderRadius: 8,
    border: "1px solid var(--cream-dark)",
    background: "var(--white)",
    color: "var(--text-secondary)",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "Nunito, sans-serif",
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
  },
  vendorChip: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid",
    cursor: "pointer",
    transition: "all 0.1s",
    position: "relative",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    padding: "16px 28px",
    borderTop: "1px solid var(--cream-dark)",
    background: "var(--cream)",
  },
  footerMeta: {
    fontSize: 12.5,
    color: "var(--text-muted)",
  },
  cancelBtn: {
    padding: "9px 18px",
    borderRadius: 8,
    border: "1px solid var(--cream-dark)",
    background: "white",
    fontSize: 14,
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
  },
  backBtn: {
    padding: "9px 18px",
    borderRadius: 8,
    border: "1px solid var(--cream-dark)",
    background: "white",
    fontSize: 14,
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
  },
  nextBtn: {
    padding: "9px 22px",
    borderRadius: 8,
    border: "none",
    background: "var(--forest-mid)",
    color: "white",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
  },
  reviewBtn: {
    padding: "9px 20px",
    borderRadius: 8,
    border: "1px solid var(--cream-dark)",
    background: "var(--white)",
    color: "var(--text-secondary)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
  },
  saveBtn: {
    padding: "9px 22px",
    borderRadius: 8,
    border: "none",
    background: "var(--wheat)",
    color: "white",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
  },
};
