import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Prime<span>Estate</span>
        </Link>

        <div className="navbar-links">
          <Link to="/">Home</Link>
          <Link to="/properties">Properties</Link>

          {!token && (
            <>
              <a href="/#about">About Us</a>
              <a href="/#contact">Contact</a>
            </>
          )}

          {token && user?.role === "seller" && (
            <Link to="/properties/add">Add Property</Link>
          )}
        </div>

        <div className="navbar-actions">
          {token ? (
            <>
              {user?.role === "customer" && (
                <Link to="/customer-dashboard" className="nav-dashboard">
                  Dashboard
                </Link>
              )}

              {user?.role === "seller" && (
                <Link to="/seller-dashboard" className="nav-dashboard">
                  Dashboard
                </Link>
              )}

              {user?.role === "admin" && (
                <Link to="/admin-dashboard" className="nav-dashboard">
                  Dashboard
                </Link>
              )}

              <button onClick={handleLogout} className="nav-login">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-login">
                Login
              </Link>

              <Link to="/signup" className="nav-signup">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
