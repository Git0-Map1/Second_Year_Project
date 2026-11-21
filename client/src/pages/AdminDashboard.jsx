
import { useEffect, useState } from "react";
import api from "../api/axios";
import LogoutButton from "../components/LogoutButton";
import "./AdminDashboard.css";

function AdminDashboard() {
  // Pending properties
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Seller applications
  const [applications, setApplications] = useState([]);
  const [applicationLoading, setApplicationLoading] = useState(true);
  const [applicationError, setApplicationError] = useState("");

  // Fetch pending properties
  const fetchPendingProperties = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/api/properties/pending");
      setProperties(response.data.properties || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load pending properties."
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch pending seller applications
  const fetchSellerApplications = async () => {
    try {
      setApplicationLoading(true);
      setApplicationError("");

      const response = await api.get("/api/admin/seller-applications");
      setApplications(response.data.applications || []);
    } catch (err) {
      setApplicationError(
        err.response?.data?.message ||
          "Failed to load seller applications."
      );
    } finally {
      setApplicationLoading(false);
    }
  };

  // Approve property
  const handleApprove = async (id) => {
    try {
      await api.patch(`/api/properties/${id}/approve`);
      alert("Property approved successfully!");
      fetchPendingProperties();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve property.");
    }
  };

  // Reject property
  const handleReject = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to reject this property?"
    );

    if (!confirmed) return;

    try {
      await api.patch(`/api/properties/${id}/reject`);
      alert("Property rejected successfully!");
      fetchPendingProperties();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject property.");
    }
  };

  // Review seller application
  const handleApplicationReview = async (id, status) => {
    const action = status === "approved" ? "approve" : "reject";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} this seller application?`
    );

    if (!confirmed) return;

    try {
      await api.patch(`/api/admin/seller-applications/${id}`, {
        status,
      });

      alert(`Seller application ${status} successfully!`);

      fetchSellerApplications();
    } catch (err) {
      alert(
        err.response?.data?.message ||
          `Failed to ${action} seller application.`
      );
    }
  };

  // Load dashboard data
  useEffect(() => {
    fetchPendingProperties();
    fetchSellerApplications();
  }, []);

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div>
          <h1>Prime Estate</h1>
          <p>Administrator Dashboard</p>
        </div>

        <LogoutButton />
      </header>

      <main className="admin-main">
        {/* Pending Property Verification */}
        <section className="admin-section">
          <h2>Pending Property Verification</h2>

          {loading && <p>Loading pending properties...</p>}

          {error && <p className="admin-error">{error}</p>}

          {!loading && !error && properties.length === 0 && (
            <p>No pending properties found.</p>
          )}

          <div className="admin-property-list">
            {properties.map((property) => (
              <div className="admin-property-card" key={property._id}>
                <h3>{property.title}</h3>

                {property.images?.length > 0 && (
                  <img
                    src={property.images[0].imageUrl}
                    alt={property.title}
                    className="admin-property-image"
                  />
                )}

                <p>Location: {property.location}</p>
                <p>Price: Rs. {property.price}</p>
                <p>Type: {property.propertyType}</p>
                <p>Status: {property.status}</p>

                <div className="admin-property-actions">
                  <button
                    className="approve-button"
                    onClick={() => handleApprove(property._id)}
                  >
                    Approve
                  </button>

                  <button
                    className="reject-button"
                    onClick={() => handleReject(property._id)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Seller Application Management */}
        <section className="admin-section">
          <h2>Seller Application Management</h2>

          {applicationLoading && (
            <p>Loading seller applications...</p>
          )}

          {applicationError && (
            <p className="admin-error">{applicationError}</p>
          )}

          {!applicationLoading &&
            !applicationError &&
            applications.length === 0 && (
              <p>No pending seller applications found.</p>
            )}

          <div className="admin-application-list">
            {applications.map((application) => (
              <div
                className="admin-application-card"
                key={application._id}
              >
                <h3>{application.user?.name || "Unknown Applicant"}</h3>

                <p>
                  <strong>Email:</strong>{" "}
                  {application.user?.email || "Not available"}
                </p>

                <p>
                  <strong>Phone:</strong> {application.phone}
                </p>

                <p>
                  <strong>Address:</strong> {application.address}
                </p>

                <p>
                  <strong>Reason:</strong> {application.reason}
                </p>

                <p>
                  <strong>Application Date:</strong>{" "}
                  {new Date(application.createdAt).toLocaleDateString()}
                </p>

                <p>
                  <strong>Status:</strong> {application.status}
                </p>

                <div className="admin-application-actions">
                  <button
                    className="approve-button"
                    onClick={() =>
                      handleApplicationReview(
                        application._id,
                        "approved"
                      )
                    }
                  >
                    Approve Seller
                  </button>

                  <button
                    className="reject-button"
                    onClick={() =>
                      handleApplicationReview(
                        application._id,
                        "rejected"
                      )
                    }
                  >
                    Reject Application
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;
