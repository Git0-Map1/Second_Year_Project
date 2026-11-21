import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import LogoutButton from "../components/LogoutButton";
import "./SellerDashboard.css";

function SellerDashboard() {
  const navigate = useNavigate();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await api.get("/api/properties/my-properties");

        setProperties(response.data.properties || []);
      } catch (error) {
        setError(
          error.response?.data?.message || "Unable to load your properties.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const totalProperties = properties.length;

  const pendingProperties = properties.filter(
    (property) => property.status === "pending",
  ).length;

  const approvedProperties = properties.filter(
    (property) => property.status === "available",
  ).length;

  const rejectedProperties = properties.filter(
    (property) => property.status === "rejected",
  ).length;

  const bookedProperties = properties.filter(
    (property) => property.status === "booked",
  ).length;

  const handleDelete = async (propertyId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this property?",
    );

    if (!confirmDelete) return;

    try {
      setDeletingId(propertyId);
      setError("");

      await api.delete(`/api/properties/${propertyId}`);

      setProperties((prevProperties) =>
        prevProperties.filter((property) => property._id !== propertyId),
      );
    } catch (error) {
      setError(error.response?.data?.message || "Unable to delete property.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="seller-dashboard">
      <h1>Welcome to Seller Dashboard</h1>

      <div>
        <h2>Property Overview</h2>

        <div className="seller-summary">
          <div className="seller-summary-card">
            <h3>Total Properties</h3>
            <p>{totalProperties}</p>
          </div>

          <div className="seller-summary-card">
            <h3>Pending Properties</h3>
            <p>{pendingProperties}</p>
          </div>

          <div className="seller-summary-card">
            <h3>Approved Properties</h3>
            <p>{approvedProperties}</p>
          </div>

          <div className="seller-summary-card">
            <h3>Rejected Properties</h3>
            <p>{rejectedProperties}</p>
          </div>

          <div className="seller-summary-card">
            <h3>Booked Properties</h3>
            <p>{bookedProperties}</p>
          </div>
        </div>
      </div>

      <div>
        <button onClick={() => navigate("/properties/add")}>
          Add New Property
        </button>

        <button onClick={() => navigate("/seller/bookings")}>
          Manage Bookings
        </button>
      </div>

      <LogoutButton />

      <hr />

      <h2>My Properties</h2>

      {loading && <p>Loading properties...</p>}

      {error && <p className="dashboard-message">{error}</p>}

      {!loading && !error && properties.length === 0 && (
        <p className="dashboard-message">
          You haven't uploaded any properties yet.
        </p>
      )}

      {!loading && !error && properties.length > 0 && (
        <div className="seller-properties">
          {properties.map((property) => (
            <div className="seller-property-card" key={property._id}>
              {property.images?.length > 0 && (
                <img
                  src={property.images[0].imageUrl}
                  alt={property.title}
                  className="seller-property-image"
                  loading="lazy"
                />
              )}

              <h3>{property.title}</h3>

              <p>Location: {property.location}</p>

              <p>Property Type: {property.propertyType}</p>

              <p>Listing Type: {property.listingType}</p>

              <p>Price: Rs. {property.price}</p>

              <p>
                Status:{" "}
                <span className={`property-status ${property.status}`}>
                  {property.status}
                </span>
              </p>

              <div className="seller-property-actions">
                <button
                  onClick={() => navigate(`/properties/edit/${property._id}`)}
                >
                  Update Property
                </button>

                <button
                  onClick={() => handleDelete(property._id)}
                  disabled={deletingId === property._id}
                >
                  {deletingId === property._id
                    ? "Deleting..."
                    : "Delete Property"}
                </button>
              </div>

              <hr />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SellerDashboard;
