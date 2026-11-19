import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import api from "../api/axios";
import "./PropertyDetails.css";

function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const response = await api.get(`/api/properties/${id}`);

        console.log("API RESPONSE:", response.data);
        setProperty(response.data.property);
      } catch (err) {
        console.log("Error:", err);
        setError(
          err.response?.data?.message || "Failed to load property details",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  if (loading) {
    return <h2>Loading property details...</h2>;
  }

  if (error) {
    return <h2>{error}</h2>;
  }

  if (!property) {
    return <h2>Property not found.</h2>;
  }

  return (
    <div className="property-details-container">
      <div className="property-heading">
        <h1>{property.title}</h1>

        <p className="property-location">
          <span>⌖</span> {property.location}
        </p>

        <h2 className="property-price">
          Rs. {Number(property.price).toLocaleString("en-IN")}
        </h2>
      </div>

      <div className="property-gallery">
        {property.images?.length > 0 ? (
          property.images.map((image, index) => (
            <img
              key={image.publicId || index}
              src={image.imageUrl}
              alt={`${property.title} ${index + 1}`}
              className="property-detail-image"
            />
          ))
        ) : (
          <p>No images available.</p>
        )}
      </div>

      <div>
        <button onClick={() => navigate(`/booking/${property._id}`)}>Book Now</button>
      </div>

      <div className="property-specifications">
        <h2>Property Information</h2>

        <p>
          <strong>Property Type:</strong> {property.propertyType}
        </p>

        <p>
          <strong>Listing Type:</strong> {property.listingType}
        </p>

        <p>
          <strong>Area:</strong> {property.area} {property.areaUnit}
        </p>

        <p>
          <strong>Bedrooms:</strong> {property.bedrooms || "N/A"}
        </p>

        <p>
          <strong>Bathrooms:</strong> {property.bathrooms || "N/A"}
        </p>
      </div>
      <div className="about-property">
        <h2>About this Property</h2>
        <p>{property.description}</p>
      </div>

      <div className="seller-information">
        <h2>Seller Information</h2>

        <p>
          <strong>Name:</strong> {property.seller?.name || "N/A"}
        </p>

        <p>
          <strong>Email:</strong> {property.seller?.email || "N/A"}
        </p>
      </div>

      <button onClick={() => navigate(-1)}>Back to properties</button>
    </div>
  );
}

export default PropertyDetails;
