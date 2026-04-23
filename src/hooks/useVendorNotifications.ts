import { useCallback, useEffect, useState } from "react";
import Parse from "../lib/parse";

export interface VendorNotification {
  objectId: string;
  vendorSlug: string;
  eventId?: string;
  eventName: string;
  eventDate?: Date | null;
  eventAddress?: string;
  marketHours?: string;
  previousBoothId?: string;
  boothId?: string;
  type: "assigned" | "reassigned" | "unassigned";
  message: string;
  isRead: boolean;
  createdAt: string;
}

function mapNotification(obj: Parse.Object): VendorNotification {
  return {
    objectId: obj.id!,
    vendorSlug: String(obj.get("vendorSlug") || ""),
    eventId: obj.get("eventId") || undefined,
    eventName: String(obj.get("eventName") || "Market event"),
    eventDate: obj.get("eventDate") || null,
    eventAddress: String(obj.get("eventAddress") || ""),
    marketHours: String(obj.get("marketHours") || ""),
    previousBoothId: String(obj.get("previousBoothId") || ""),
    boothId: String(obj.get("boothId") || ""),
    type: (obj.get("type") || "assigned") as "assigned" | "reassigned" | "unassigned",
    message: String(obj.get("message") || ""),
    isRead: Boolean(obj.get("isRead")),
    createdAt: obj.createdAt?.toISOString() || new Date().toISOString(),
  };
}

export function useVendorNotifications(vendorSlug: string) {
  const [notifications, setNotifications] = useState<VendorNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!vendorSlug) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const query = new Parse.Query("VendorNotification");
      query.equalTo("vendorSlug", vendorSlug);
      query.descending("createdAt");
      query.limit(40);
      const results = await query.find();
      setNotifications(results.map(mapNotification));
    } catch (e: any) {
      setError(e?.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [vendorSlug]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const Notification = Parse.Object.extend("VendorNotification");
      const obj = Notification.createWithoutData(notificationId);
      obj.set("isRead", true);
      await obj.save();
      setNotifications((previous) =>
        previous.map((item) =>
          item.objectId === notificationId ? { ...item, isRead: true } : item
        )
      );
    } catch {
      // Best-effort only; don't interrupt dashboard flows.
    }
  }, []);

  return { notifications, loading, error, refetch: fetchNotifications, markAsRead };
}
