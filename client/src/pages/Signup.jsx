import { useState } from "react";
import "./Signup.css";
import { Link } from "react-router-dom";
import api from "../api/axios";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/auth/signup", {
        name,
        email,
        password,
      });

      alert("Account created successfully!");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to connect to server. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        {/* Left side - Signup form */}
        <div className="signup-form-section">
          <Link to="/" className="signup-logo">
            <span>PRIME</span> ESTATE.
          </Link>

          <div className="signup-heading">
            <h1>Create Account</h1>
            <p>Join Prime Estate and find your perfect property.</p>
          </div>

          <form onSubmit={handleSignup}>
            <div className="signup-form-group">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="signup-form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="signup-form-group">
              <label>Password</label>

              <div className="signup-password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength="100"
                  required
                />

                <button
                  type="button"
                  className="signup-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="signup-form-group">
              <label>Confirm Password</label>

              <div className="signup-password-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  maxLength="100"
                  required
                />
                <button
                  type="button"
                  className="signup-toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && <p className="signup-error">{error}</p>}

            <button type="submit" className="signup-button" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="signup-login-link">
            Already have an account?
            <Link to="/login"> Login</Link>
          </div>
          <p className="signup-footer">
            © 2026 Prime Estate. All rights reserved.
          </p>
        </div>

        {/* Right side - Property image */}
        <div className="signup-image-section">
          <div className="signup-image-overlay">
            <h2>
              Find a Place
              <br />
              You'll Love to Call Home.
            </h2>

            <p>
              Discover exceptional properties and make your dream home a reality
              with Prime Estate.
            </p>

            <span>YOUR PROPERTY, OUR PRIORITY.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
