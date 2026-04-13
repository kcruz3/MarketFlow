import React, { useState } from "react";
import { useMarketEvents, MarketEvent } from "../../hooks/useMarketEvents";
import EventList from "../../components/admin/EventList";
import AddEventModal from "../../components/admin/AddEventModal";
import { splitEventsByDate } from "../../lib/marketEvents";

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
                <EventList events={upcoming} onEdit={handleEdit} />
              </div>
            </div>

            {past.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3>Past Events</h3>
                  <span className="badge badge-gray">{past.length} events</span>
                </div>
                <div className="card-body">
                  <EventList events={past} onEdit={handleEdit} />
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
