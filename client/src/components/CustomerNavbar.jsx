
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import LogoutButton from "./LogoutButton";
import "./CustomerNavbar.css";

function CustomerNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "null");

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="customer-navbar">
      <Link to="/" className="navbar-logo" onClick={closeMenu}>
        Prime Estate
      </Link>

      <button
        className="navbar-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle navigation"
      >
        ☰
      </button>

      <div className={`navbar-links ${menuOpen ? "active" : ""}`}>
        <NavLink to="/" onClick={closeMenu}>
          Home
        </NavLink>

        <NavLink to="/properties" onClick={closeMenu}>
          Properties
        </NavLink>

        {user?.role === "customer" && (
          <>
            <NavLink to="/customer-dashboard" onClick={closeMenu}>
              Dashboard
            </NavLink>

            <NavLink to="/seller-application" onClick={closeMenu}>
              Become a Seller
            </NavLink>
          </>
        )}

        {!user && (
          <>
            <NavLink to="/login" onClick={closeMenu}>
              Login
            </NavLink>

            <NavLink to="/signup" onClick={closeMenu}>
              Sign Up
            </NavLink>
          </>
        )}

        {user && <LogoutButton />}
      </div>
    </nav>
  );
}

export default CustomerNavbar;
