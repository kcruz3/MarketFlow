import { BoothPosition } from "../components/consumer/MarketMap";

type DateValue = Date | string | number | null | undefined;
export type EventWorkflowStatus = "draft" | "review" | "published";

export interface EventValidationContext {
  name: string;
  date: DateValue;
  hours: string;
  address?: string;
  selectedVendorSlugs: string[];
  boothMap: BoothPosition[];
}

export interface EventValidationResult {
  canSubmitForReview: boolean;
  canPublish: boolean;
  checklist: {
    detailsComplete: boolean;
    hasVendors: boolean;
    hasBooths: boolean;
    allSelectedVendorsAssigned: boolean;
    noOverlappingBooths: boolean;
    noUnknownAssignedVendors: boolean;
  };
  reviewIssues: string[];
  publishIssues: string[];
}

function toValidDate(value: DateValue): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function getUtcDateParts(value: DateValue): {
  year: number;
  month: number;
  day: number;
} | null {
  const date = toValidDate(value);
  if (!date) {
    return null;
  }

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function isBoothPosition(value: unknown): value is BoothPosition {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as BoothPosition).x === "number" &&
    typeof (value as BoothPosition).y === "number" &&
    typeof (value as BoothPosition).w === "number" &&
    typeof (value as BoothPosition).h === "number" &&
    typeof (value as BoothPosition).boothId === "string"
  );
}

export function parseBoothMap(raw: unknown): BoothPosition[] {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw.filter(isBoothPosition);
  }

  if (raw && typeof raw === "object") {
    return Object.values(raw).filter(isBoothPosition);
  }

  return [];
}

export function deriveWorkflowStatus(raw: unknown, isPublished: boolean): EventWorkflowStatus {
  if (raw === "draft" || raw === "review" || raw === "published") {
    return raw;
  }
  return isPublished ? "published" : "draft";
}

function boothsOverlap(a: BoothPosition, b: BoothPosition) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function validateEventForWorkflow(
  context: EventValidationContext
): EventValidationResult {
  const selectedSet = new Set(context.selectedVendorSlugs.filter(Boolean));
  const assignedBooths = context.boothMap.filter((booth) => (booth.vendorSlug || "").trim());
  const assignedSlugs = assignedBooths.map((booth) => (booth.vendorSlug || "").trim());
  const assignedSet = new Set(assignedSlugs);
  const unknownAssigned = assignedSlugs.filter((slug) => !selectedSet.has(slug));

  const overlappingBooths = new Set<string>();
  for (let i = 0; i < context.boothMap.length; i += 1) {
    for (let j = i + 1; j < context.boothMap.length; j += 1) {
      if (boothsOverlap(context.boothMap[i], context.boothMap[j])) {
        overlappingBooths.add(context.boothMap[i].boothId);
        overlappingBooths.add(context.boothMap[j].boothId);
      }
    }
  }

  const missingSelectedAssignments = context.selectedVendorSlugs.filter(
    (slug) => slug && !assignedSet.has(slug)
  );

  const detailsComplete =
    !!String(context.name || "").trim() &&
    !!toValidDate(context.date) &&
    !!String(context.hours || "").trim() &&
    !!String(context.address || "").trim();
  const hasVendors = selectedSet.size > 0;
  const hasBooths = context.boothMap.length > 0;
  const allSelectedVendorsAssigned = missingSelectedAssignments.length === 0;
  const noOverlappingBooths = overlappingBooths.size === 0;
  const noUnknownAssignedVendors = unknownAssigned.length === 0;

  const reviewIssues: string[] = [];
  if (!detailsComplete) {
    reviewIssues.push("Complete event details (name, date, hours, and address).");
  }
  if (!hasVendors) {
    reviewIssues.push("Select at least one participating vendor.");
  }

  const publishIssues = [...reviewIssues];
  if (!hasBooths) {
    publishIssues.push("Create at least one booth in the map.");
  }
  if (!noOverlappingBooths) {
    publishIssues.push(
      `Resolve booth overlaps before publishing (${overlappingBooths.size} overlapping booths).`
    );
  }
  if (!noUnknownAssignedVendors) {
    publishIssues.push(
      `Remove or replace assigned vendors not in this event (${unknownAssigned.length} found).`
    );
  }

  return {
    canSubmitForReview: reviewIssues.length === 0,
    canPublish: publishIssues.length === 0,
    checklist: {
      detailsComplete,
      hasVendors,
      hasBooths,
      allSelectedVendorsAssigned,
      noOverlappingBooths,
      noUnknownAssignedVendors,
    },
    reviewIssues,
    publishIssues,
  };
}

export function serializeBoothMap(
  booths: BoothPosition[]
): Record<string, BoothPosition> {
  return booths.reduce<Record<string, BoothPosition>>((accumulator, booth, index) => {
    accumulator[String(index)] = booth;
    return accumulator;
  }, {});
}

export function toDateInputValue(value: DateValue): string {
  const parts = getUtcDateParts(value);
  if (!parts) {
    return "";
  }

  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function formatEventDate(
  value: DateValue,
  options: Intl.DateTimeFormatOptions,
  locale: string = "en-US"
): string {
  const date = toValidDate(value);
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
    date
  );
}

export function isUpcomingDate(value: DateValue, now: Date = new Date()) {
  const eventParts = getUtcDateParts(value);
  if (!eventParts) {
    return false;
  }

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  const eventKey = eventParts.year * 10000 + eventParts.month * 100 + eventParts.day;
  const currentKey = currentYear * 10000 + currentMonth * 100 + currentDay;

  return eventKey >= currentKey;
}

export function splitEventsByDate<T extends { date: DateValue }>(
  events: T[],
  now: Date = new Date()
) {
  return events.reduce(
    (groups, event) => {
      if (isUpcomingDate(event.date, now)) {
        groups.upcoming.push(event);
      } else {
        groups.past.push(event);
      }

      return groups;
    },
    { upcoming: [] as T[], past: [] as T[] }
  );
}

export function sortEventsByDateAsc<T extends { date: DateValue }>(events: T[]) {
  return [...events].sort(
    (left, right) => new Date(left.date!).getTime() - new Date(right.date!).getTime()
  );
}
