import { BoothPosition } from "../components/consumer/MarketMap";

type DateValue = Date | string | number | null | undefined;

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
