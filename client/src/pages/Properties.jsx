import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/axios";
import "./Properties.css";

function Properties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await api.get("/api/properties");

        setProperties(response.data.properties || []);
        console.log(
          "first property images:",
          response.data.properties?.[0]?.images
        )
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load properties");
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  if (loading) {
    return <h2>Loading properties...</h2>;
  }

  if (error) {
    return <h2>{error}</h2>;
  }

  return (
    <div className="properties-page">
      <div className="properties-header">
        <h1>Explore Properties</h1>
        <p>Find your perfect property with Prime Estate.</p>
      </div>

      {properties.length === 0 ? (
        <p>No properties available.</p>
      ) : (
        <div className="properties-grid">
          {properties.map((property) => (
            <div className="property-card" key={property._id}>
              <img
                src={
                  property.images?.[0]?.imageUrl ||
                  "https://placehold.co/600x400?text=No+Image"
                }
                alt={property.title}
                className="property-image"
              />

              <div className="property-info">
                <h2>{property.title}</h2>

                <p className="property-location">📍 {property.location}</p>

                <p className="property-price">
                  Rs. {Number(property.price).toLocaleString("en-IN")}
                </p>

                <span className="property-type">{property.propertyType}</span>

                <button className="property-button" 
                onClick={()=>navigate(`/properties/${property._id}`)}>View Details</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Properties;
