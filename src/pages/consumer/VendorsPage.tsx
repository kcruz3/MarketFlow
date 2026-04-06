import React from "react";
import { useVendors } from "../../hooks/useVendors";
import VendorTable from "../../components/admin/VendorTable";

export default function VendorsPage() {
  const { vendors, loading, error } = useVendors();

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Vendors</div>
        <button className="btn btn-primary">+ Add Vendor</button>
      </div>

      <div className="page-content">
        <div className="page-header">
          <h2>Vendor Roster</h2>
          <p>Manage all vendors for the Bellevue Farmers Market</p>
        </div>

        {loading ? (
          <div className="loading-spinner">Loading vendors...</div>
        ) : error ? (
          <div className="empty-state">
            <h3>Could not load vendors</h3>
            <p>{error}</p>
          </div>
        ) : (
          <VendorTable vendors={vendors} />
        )}
      </div>
    </div>
  );
}
