import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import LogoutButton from "../components/LogoutButton";
import "./CustomerDashboard.css";

function CustomerDashboard() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Get logged-in user
  const user = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await api.get("/api/bookings/my-bookings");

        setBookings(response.data.bookings || []);
      } catch (error) {
        setError(
          error.response?.data?.message || "Unable to load booking history.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  // Display only active bookings
  const activeBookings = bookings.filter(
    (booking) =>
      booking.bookingStatus === "pending" ||
      booking.bookingStatus === "approved",
  );

  const totalBookings = activeBookings.length;

  const pendingBookings = activeBookings.filter(
    (booking) => booking.bookingStatus === "pending",
  ).length;

  const approvedBookings = activeBookings.filter(
    (booking) => booking.bookingStatus === "approved",
  ).length;

  return (
    <div className="customer-dashboard">
      <h1>Welcome to Customer Dashboard</h1>

      <div className="booking-summary">
        <div className="summary-card">
          <h3>Total Bookings</h3>
          <p>{totalBookings}</p>
        </div>

        <div className="summary-card">
          <h3>Pending Bookings</h3>
          <p>{pendingBookings}</p>
        </div>

        <div className="summary-card">
          <h3>Approved Bookings</h3>
          <p>{approvedBookings}</p>
        </div>
      </div>

      <button onClick={() => navigate("/properties")}>Browse Properties</button>

      {user?.role === "customer" && (
        <button onClick={() => navigate("/seller-application")}>
          Become a Seller
        </button>
      )}

      <LogoutButton />

      <hr />

      <div className="booking-history">
        <h2>My Booking History</h2>

        {loading && <p className="dashboard-loading">Loading bookings...</p>}

        {error && <p className="dashboard-error">{error}</p>}

        {!loading && !error && bookings.length === 0 && (
          <p className="dashboard-empty">You have no booking history yet.</p>
        )}

        {!loading && !error && bookings.length > 0 && (
          <div>
            {bookings.map((booking) => (
              <div className="booking-card" key={booking._id}>
                <h3>{booking.property?.title || "Property unavailable"}</h3>

                <p>
                  Booking Date:{" "}
                  {new Date(booking.createdAt).toLocaleDateString()}
                </p>

                <p>
                  Booking Status:{" "}
                  <span className="booking-status">
                    {booking.bookingStatus}
                  </span>
                </p>

                <p>
                  Payment Status:{" "}
                  <span className="payment-status">
                    {booking.paymentStatus}
                  </span>
                </p>

                <p>Booking Fee: Rs. {booking.bookingFee}</p>

                <p>Payment Method: {booking.paymentMethod}</p>

                <p>
                  Transaction ID: {booking.transactionId || "Not available"}
                </p>

                {booking.refundStatus !== "not_required" && (
                  <p>Refund Status: {booking.refundStatus}</p>
                )}

                {booking.latePaymentReviewStatus !== "not_required" && (
                  <p>Late Payment Review: {booking.latePaymentReviewStatus}</p>
                )}

                <hr />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerDashboard;
