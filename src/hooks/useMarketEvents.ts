import { useEffect, useState, useCallback } from "react";
import Parse from "../lib/parse";
import { BoothPosition } from "../components/consumer/MarketMap";
import { parseBoothMap } from "../lib/marketEvents";

export interface MarketEvent {
  objectId: string;
  name: string;
  date: Date;
  endDate: Date;
  hours: string;
  address: string;
  boothMap: BoothPosition[];
  isPublished: boolean;
  notes: string;
}

export function useMarketEvents() {
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const query = new Parse.Query("MarketEvent");
      query.ascending("date");
      query.limit(50);
      const results = await query.find();
      setEvents(
        results.map((r) => ({
          objectId: r.id!,
          name: r.get("name") ?? "",
          date: r.get("date"),
          endDate: r.get("endDate"),
          hours: r.get("hours") ?? "",
          address: r.get("address") ?? "",
          boothMap: parseBoothMap(r.get("boothMap")),
          isPublished: r.get("isPublished") ?? false,
          notes: r.get("notes") ?? "",
        }))
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}
