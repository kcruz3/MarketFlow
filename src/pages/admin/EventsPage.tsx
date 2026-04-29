import React, { useState } from "react";
import { useMarketEvents, MarketEvent } from "../../hooks/useMarketEvents";
import EventList from "../../components/admin/EventList";
import AddEventModal from "../../components/admin/AddEventModal";
import {
  getWorkflowTransitionIssues,
  parseBoothMap,
  splitEventsByDate,
  validateEventForWorkflow,
} from "../../lib/marketEvents";
import Parse from "../../lib/parse";

export default function EventsPage() {
  const { events, loading, error, refetch } = useMarketEvents();
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<MarketEvent | null>(null);

  const { upcoming, past } = splitEventsByDate(events);

  const handleEdit = (event: MarketEvent) => {
    setEditingEvent(event);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingEvent(null);
  };

  const handleSaved = () => {
    handleClose();
    refetch();
  };

  const handleStatusChange = async (
    event: MarketEvent,
    status: "draft" | "review" | "published"
  ) => {
    try {
      await Parse.Cloud.run("updateEventWorkflowStatus", {
        eventId: event.objectId,
        status,
      });
      refetch();
    } catch (e: any) {
      const message = String(e?.message || "");
      const invalidFunction =
        message.includes('Invalid function: "updateEventWorkflowStatus"') ||
        message.includes("Invalid function");
      if (!invalidFunction) {
        window.alert(message || "Unable to update event workflow status.");
        return;
      }

      try {
        const eventQuery = new Parse.Query("MarketEvent");
        const eventObj = await eventQuery.get(event.objectId);
        const selectedVendors = await eventObj
          .relation("vendors")
          .query()
          .limit(1000)
          .find();
        const selectedVendorSlugs = selectedVendors
          .map((vendor) => String(vendor.get("slug") || "").trim())
          .filter(Boolean);
        const validation = validateEventForWorkflow({
          name: String(eventObj.get("name") || ""),
          date: eventObj.get("date"),
          hours: String(eventObj.get("hours") || ""),
          address: String(eventObj.get("address") || ""),
          selectedVendorSlugs,
          boothMap: parseBoothMap(eventObj.get("boothMap")),
        });
        const transitionIssues = getWorkflowTransitionIssues(
          event.workflowStatus,
          status,
          validation
        );

        if (transitionIssues.length > 0) {
          window.alert(transitionIssues.join(" "));
          return;
        }

        eventObj.set("workflowStatus", status);
        eventObj.set("isPublished", status === "published");
        eventObj.set("reviewChecklist", validation.checklist);
        eventObj.set(
          "reviewIssues",
          status === "published" ? validation.publishIssues : validation.reviewIssues
        );
        eventObj.set("lastValidatedAt", new Date());
        await eventObj.save();
        refetch();
      } catch (fallbackError: any) {
        window.alert(
          fallbackError?.message ||
            "Unable to update event workflow status (fallback failed)."
        );
      }
    }
  };

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Market Events</div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Add Event
        </button>
      </div>

      <div className="page-content">
        <div className="page-header">
          <h2>Market Calendar</h2>
          <p>Schedule and manage market event dates</p>
        </div>

        {loading ? (
          <div className="loading-spinner">Loading events...</div>
        ) : error ? (
          <div className="empty-state">
            <h3>Could not load events</h3>
            <p>{error}</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 20 }}>
            <div className="card">
              <div className="card-header">
                <h3>Upcoming Events</h3>
                <span className="badge badge-green">
                  {upcoming.length} scheduled
                </span>
              </div>
              <div className="card-body">
                <EventList
                  events={upcoming}
                  onEdit={handleEdit}
                  onStatusChange={handleStatusChange}
                />
              </div>
            </div>

            {past.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3>Past Events</h3>
                  <span className="badge badge-gray">{past.length} events</span>
                </div>
                <div className="card-body">
                  <EventList
                    events={past}
                    onEdit={handleEdit}
                    onStatusChange={handleStatusChange}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <AddEventModal
          onClose={handleClose}
          onSaved={handleSaved}
          event={editingEvent ?? undefined}
        />
      )}
    </div>
  );
}
