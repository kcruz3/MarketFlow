/// <reference types="jest" />

import {
  deriveWorkflowStatus,
  getWorkflowTransitionIssues,
  isUpcomingDate,
  parseBoothMap,
  serializeBoothMap,
  sortEventsByDateAsc,
  splitEventsByDate,
  toDateInputValue,
  validateEventForWorkflow,
} from "./marketEvents";

describe("marketEvents test harness", () => {
  it("parses booth maps from keyed objects and ignores invalid entries", () => {
    const booths = parseBoothMap({
      "0": {
        boothId: "A1",
        vendorSlug: "vendor-a",
        vendorName: "Vendor A",
        category: "Farmers, Fishers, Foragers",
        x: 10,
        y: 20,
        w: 30,
        h: 40,
      },
      "1": {
        boothId: "A2",
        vendorSlug: "vendor-b",
        vendorName: "Vendor B",
        category: "Prepared Food",
        x: 50,
        y: 60,
        w: 70,
        h: 80,
      },
      "2": { boothId: "broken", x: "bad", y: 0, w: 0, h: 0 },
    });

    expect(booths).toEqual([
      {
        boothId: "A1",
        vendorSlug: "vendor-a",
        vendorName: "Vendor A",
        category: "Farmers, Fishers, Foragers",
        x: 10,
        y: 20,
        w: 30,
        h: 40,
      },
      {
        boothId: "A2",
        vendorSlug: "vendor-b",
        vendorName: "Vendor B",
        category: "Prepared Food",
        x: 50,
        y: 60,
        w: 70,
        h: 80,
      },
    ]);
  });

  it("serializes booth maps into Parse-friendly keyed objects", () => {
    expect(
      serializeBoothMap([
        {
          boothId: "A1",
          vendorSlug: "vendor-a",
          vendorName: "Vendor A",
          category: "Farmers, Fishers, Foragers",
          x: 10,
          y: 20,
          w: 30,
          h: 40,
        },
        {
          boothId: "A2",
          vendorSlug: "vendor-b",
          vendorName: "Vendor B",
          category: "Prepared Food",
          x: 50,
          y: 60,
          w: 70,
          h: 80,
        },
      ])
    ).toEqual({
      "0": {
        boothId: "A1",
        vendorSlug: "vendor-a",
        vendorName: "Vendor A",
        category: "Farmers, Fishers, Foragers",
        x: 10,
        y: 20,
        w: 30,
        h: 40,
      },
      "1": {
        boothId: "A2",
        vendorSlug: "vendor-b",
        vendorName: "Vendor B",
        category: "Prepared Food",
        x: 50,
        y: 60,
        w: 70,
        h: 80,
      },
    });
  });

  it("formats date values for date inputs", () => {
    expect(toDateInputValue(new Date("2026-04-12T15:30:00.000Z"))).toBe(
      "2026-04-12"
    );
    expect(toDateInputValue(undefined)).toBe("");
  });

  it("splits and sorts events around a shared reference date", () => {
    const now = new Date("2026-04-12T12:00:00.000Z");
    const events = [
      { objectId: "2", date: new Date("2026-04-14T09:00:00.000Z") },
      { objectId: "1", date: new Date("2026-04-10T09:00:00.000Z") },
      { objectId: "3", date: new Date("2026-04-13T09:00:00.000Z") },
    ];

    const sorted = sortEventsByDateAsc(events);
    const grouped = splitEventsByDate(events, now);

    expect(sorted.map((event) => event.objectId)).toEqual(["1", "3", "2"]);
    expect(grouped.upcoming.map((event) => event.objectId)).toEqual(["2", "3"]);
    expect(grouped.past.map((event) => event.objectId)).toEqual(["1"]);
    expect(isUpcomingDate(events[0].date, now)).toBe(true);
    expect(isUpcomingDate(events[1].date, now)).toBe(false);
  });

  it("derives workflow status from stored values", () => {
    expect(deriveWorkflowStatus("review", false)).toBe("review");
    expect(deriveWorkflowStatus(undefined, true)).toBe("published");
    expect(deriveWorkflowStatus(undefined, false)).toBe("draft");
  });

  it("validates publish readiness with vendor and booth checks", () => {
    const validation = validateEventForWorkflow({
      name: "Summer Market",
      date: "2026-05-01",
      hours: "10:00 AM – 3:00 PM",
      address: "1105 Northside Blvd",
      selectedVendorSlugs: ["vendor-a", "vendor-b"],
      boothMap: [
        {
          boothId: "A1",
          vendorSlug: "vendor-a",
          vendorName: "Vendor A",
          category: "Prepared Food",
          x: 10,
          y: 10,
          w: 80,
          h: 80,
        },
      ],
    });

    expect(validation.canSubmitForReview).toBe(true);
    expect(validation.canPublish).toBe(true);
    expect(validation.checklist.allSelectedVendorsAssigned).toBe(false);
  });

  it("requires review before publish even when publish checks pass", () => {
    const validation = validateEventForWorkflow({
      name: "Summer Market",
      date: "2026-05-01",
      hours: "10:00 AM - 3:00 PM",
      address: "1105 Northside Blvd",
      selectedVendorSlugs: ["vendor-a"],
      boothMap: [
        {
          boothId: "A1",
          vendorSlug: "vendor-a",
          vendorName: "Vendor A",
          category: "Prepared Food",
          x: 10,
          y: 10,
          w: 80,
          h: 80,
        },
      ],
    });

    expect(getWorkflowTransitionIssues("draft", "published", validation)).toContain(
      "Send this event to review before publishing."
    );
    expect(getWorkflowTransitionIssues("review", "published", validation)).toEqual([]);
  });
});
