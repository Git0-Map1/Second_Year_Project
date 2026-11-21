
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./SellerApplication.css";

function SellerApplication() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    phone: "",
    address: "",
    reason: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      !formData.phone.trim() ||
      !formData.address.trim() ||
      !formData.reason.trim()
    ) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post(
        "/api/seller-applications",
        formData
      );

      setSuccess(
        response.data.message ||
          "Seller application submitted successfully!"
      );

      setFormData({
        phone: "",
        address: "",
        reason: "",
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to submit seller application."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="seller-application-page">
      <div className="seller-application-container">
        <h1>Become a Seller</h1>

        <p className="seller-application-description">
          Join Prime Estate as a seller and start listing your
          properties.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="seller-form-group">
            <label htmlFor="phone">Contact Number</label>

            <input
              type="tel"
              id="phone"
              name="phone"
              placeholder="Enter your contact number"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>

          <div className="seller-form-group">
            <label htmlFor="address">Address</label>

            <input
              type="text"
              id="address"
              name="address"
              placeholder="Enter your address"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </div>

          <div className="seller-form-group">
            <label htmlFor="reason">
              Why do you want to become a seller?
            </label>

            <textarea
              id="reason"
              name="reason"
              placeholder="Tell us why you want to become a seller..."
              rows="5"
              value={formData.reason}
              onChange={handleChange}
              required
            />
          </div>

          {error && (
            <p className="seller-form-error">{error}</p>
          )}

          {success && (
            <p className="seller-form-success">{success}</p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Application"}
          </button>

          <button
            type="button"
            className="seller-back-button"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
        </form>
      </div>
    </div>
  );
}

export default SellerApplication;
