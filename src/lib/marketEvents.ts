import { BoothPosition } from "../components/consumer/MarketMap";

type DateValue = Date | string | number | null | undefined;

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
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().split("T")[0];
}

export function isUpcomingDate(value: DateValue, now: Date = new Date()) {
  if (!value) {
    return false;
  }

  return new Date(value) >= now;
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
