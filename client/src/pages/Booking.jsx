import "./Booking.css";

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api/axios";

function Booking() {
  const { id } = useParams();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    citizenshipNumber: "",
    permanentAddress: "",
    contactNumber: "",
    email: "",
    paymentMethod: "esewa",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await api.post("/api/bookings", {
        propertyId: id,
        ...formData,
      });

      const { paymentUrl, paymentData, success } = response.data;

      if (!success || !paymentUrl || !paymentData) {
        throw new Error("Invalid payment response from server.");
      }

      const paymentForm = document.createElement("form");
      paymentForm.method = "POST";
      paymentForm.action = paymentUrl;

      Object.entries(paymentData).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        paymentForm.appendChild(input);
      });

      document.body.appendChild(paymentForm);
      paymentForm.submit();
    } catch (err) {
      setSubmitError(
        err.response?.data?.message ||
          err.message ||
          "Booking failed. Please try again.",
      );

      setSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const response = await api.get(`/api/properties/${id}`);
        setProperty(response.data.property);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load property");
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  if (loading) {
    return <h2>Loading booking details...</h2>;
  }

  if (error) {
    return <h2>{error}</h2>;
  }

  if (!property) {
    return <h2>Property not found.</h2>;
  }

  return (
    <div className="booking-page">
      <h1 className="booking-page-title">Complete Your Booking</h1>

      <div className="booking-content">
        <div className="booking-property-card">
          <h2>Selected Property</h2>

          {property.images?.length > 0 && (
            <img
              src={property.images[0].imageUrl}
              alt={property.title}
              className="booking-property-image"
            />
          )}

          <h3>{property.title}</h3>

          <p>Location: {property.location}</p>

          <p>
            Property Price: Rs. {Number(property.price).toLocaleString("en-IN")}
          </p>
        </div>

        <div className="booking-form-container">
          <h2>Customer Information</h2>
          {submitError && <p className="booking-error">{submitError}</p>}

          <form className="customer-booking-form" onSubmit={handleSubmit}>
            <div className="booking-input-group">
              <label>Full Name</label>
              <input
                type="text"
                name="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="booking-input-group">
              <label>Citizenship Number</label>
              <input
                type="text"
                name="citizenshipNumber"
                placeholder="Enter your citizenship number"
                value={formData.citizenshipNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="booking-input-group">
              <label>Permanent Address</label>
              <input
                type="text"
                name="permanentAddress"
                placeholder="Enter your permanent address"
                value={formData.permanentAddress}
                onChange={handleChange}
                required
              />
            </div>

            <div className="booking-input-group">
              <label>Contact Number</label>
              <input
                type="text"
                name="contactNumber"
                placeholder="Enter your contact number"
                value={formData.contactNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="booking-input-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="booking-payment-section">
              <h3>Booking Payment</h3>

              <div className="booking-fee">
                <span>Booking Fee</span>
                <strong>Rs. 10</strong>
              </div>

              <div className="booking-input-group">
                <label>Payment Method</label>

                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                >
                  <option value="esewa">eSewa</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="confirm-booking-button"
              disabled={submitting}
            >
              {submitting ? "Processing..." : "Confirm Booking"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Booking;
