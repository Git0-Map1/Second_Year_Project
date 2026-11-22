import Navbar from "../components/Navbar";
import { Link, useNavigate } from "react-router-dom";
import "./Home.css";
import { useEffect, useState } from "react";
import api from "../api/axios";

function Home() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [searchLocation, setSearchLocation] = useState("");
  const [searchType, setSearchType] = useState("");
  const [searchListing, setSearchListing] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();

    const params = new URLSearchParams();

    if (searchLocation.trim()) {
      params.set("location", searchLocation.trim());
    }

    if (searchType) {
      params.set("propertyType", searchType);
    }

    if (searchListing) {
      params.set("listingType", searchListing);
    }

    navigate(`/properties?${params.toString()}`);
  };

  useEffect(() => {
    const fetchFeaturedProperties = async () => {
      try {
        const response = await api.get("/api/properties");

        setProperties((response.data.properties || []).slice(0, 3));
      } catch (error) {
        console.error("Failed to load featured properties:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProperties();
  }, []);

  return (

      <main className="home-page">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <p className="hero-subtitle">WELCOME TO PRIME ESTATE</p>

            <h1>
              Find Your Perfect
              <span> Place to Call Home.</span>
            </h1>

            <p className="hero-description">
              Discover houses, apartments, and land across Nepal. Your dream
              property is just one step away.
            </p>

            <form className="hero-search-form" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Enter location (e.g. Kathmandu)"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
              />

              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
              >
                <option value="">Property Type</option>
                <option value="house">House</option>
                <option value="apartment">Apartment</option>
                <option value="land">Land</option>
                <option value="commercial">Commercial</option>
              </select>

              <select
                value={searchListing}
                onChange={(e) => setSearchListing(e.target.value)}
              >
                <option value="">Sale or Rent</option>
                <option value="sale">For Sale</option>
                <option value="rent">For Rent</option>
              </select>

              <button type="submit">Search Properties</button>
            </form>
            
            <div className="hero-buttons">
              <Link to="/properties" className="hero-primary-btn">
                Explore Properties
              </Link>

              <Link to="/signup" className="hero-secondary-btn">
                Get Started
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Properties */}
        <section className="featured-section">
          <div className="section-heading">
            <p>OUR LISTINGS</p>
            <h2>Featured Properties</h2>
            <span>
              Explore some of the latest properties available on Prime Estate.
            </span>
          </div>

          {loading ? (
            <p className="featured-message">Loading properties...</p>
          ) : properties.length === 0 ? (
            <p className="featured-message">
              No properties available at the moment.
            </p>
          ) : (
            <div className="featured-grid">
              {properties.map((property) => (
                <div className="featured-card" key={property._id}>
                  <img
                    src={
                      property.images?.[0]?.imageUrl ||
                      "https://placehold.co/600x400?text=No+Image"
                    }
                    alt={property.title}
                  />

                  <div className="featured-card-info">
                    <span className="featured-type">
                      {property.propertyType}
                    </span>

                    <h3>{property.title}</h3>

                    <p className="featured-location">📍 {property.location}</p>

                    <p className="featured-price">
                      Rs. {Number(property.price).toLocaleString("en-IN")}
                    </p>

                    <Link
                      to={`/properties/${property._id}`}
                      className="featured-button"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="featured-view-all">
            <Link to="/properties">View All Properties →</Link>
          </div>
        </section>

        {/* Property Categories */}
        <section className="categories-section">
          <div className="section-heading">
            <p>EXPLORE PROPERTIES</p>
            <h2>Find What You're Looking For</h2>
            <span>Browse properties based on your needs.</span>
          </div>

          <div className="category-grid">
            <Link to="/properties" className="category-card">
              <div className="category-icon">🏡</div>
              <h3>Houses</h3>
              <p>Find your dream home.</p>
            </Link>

            <Link to="/properties" className="category-card">
              <div className="category-icon">🏢</div>
              <h3>Apartments</h3>
              <p>Explore modern apartments.</p>
            </Link>

            <Link to="/properties" className="category-card">
              <div className="category-icon">🌳</div>
              <h3>Land</h3>
              <p>Find the right piece of land.</p>
            </Link>

            <Link to="/properties" className="category-card">
              <div className="category-icon">🏬</div>
              <h3>Commercial</h3>
              <p>Discover business properties.</p>
            </Link>
          </div>
        </section>

        {/* About Section */}
        <section className="about-section" id="about">
          <div>
            <p className="about-subtitle">WHY PRIME ESTATE?</p>
            <h2>Your Property Journey Starts Here.</h2>
            <p>
              Prime Estate makes discovering and booking properties easier.
              Explore listings, connect with sellers, and find opportunities
              that match your needs.
            </p>
            <Link to="/properties" className="about-btn">
              Browse Properties
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="home-footer" id="contact">
          <h2>
            Prime<span>Estate</span>
          </h2>
          <p>Your trusted partner in finding the right property.</p>
          <p>© {new Date().getFullYear()} Prime Estate. All rights reserved.</p>
        </footer>
      </main>
  
  );
}

export default Home;
