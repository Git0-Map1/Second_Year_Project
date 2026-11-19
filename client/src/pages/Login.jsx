import { useState } from "react";
import api from "../api/axios";
import "./Login.css";
import {useNavigate} from "react-router-dom";

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });
      console.log("Login Response:", response.data);

      // Save JWT token
      localStorage.setItem("token", response.data.jwtToken);

      // Save user information
      localStorage.setItem(
        "user",
        JSON.stringify({
          name: response.data.name,
          email: response.data.email,
          role: response.data.role,
        }),
      );

      setMessage(response.data.message);

      //Redirect according to user role
      const role = response.data.role;

      if(role === "customer"){
        navigate("/customer-dashboard");
      } else if (role === "seller"){
        navigate("/seller-dashboard")
      } else if (role === "admin"){
        navigate("/admin-dashboard")
      }
      
    } catch (err) {
      setMessage(
        err.response?.data?.message || "unable to connect to server",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left side - Login form */}
        <div className="login-form-section">
          <a href="/" className="login-logo">
            <span>PRIME</span> ESTATE.
          </a>

          <div className="login-heading">
            <h1>Welcome Back!</h1>
            <p>Login to discover your perfect property.</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>

              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength="100"
                  required
                />

                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" />
                Remember me
              </label>

              <a href="/forgot-password">Forgot password?</a>
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "logining in... " : "login"}
            </button>

            {message && <p className="login-message">{message}</p>}
          </form>

          <div className="signup-link">
            Don't have an account?
            <a href="/signup"> Sign Up</a>
          </div>

          <p className="login-footer">
            © 2026 Prime Estate. All rights reserved.
          </p>
        </div>

        {/* Right side - Property image */}
        <div className="login-image-section">
          <div className="image-overlay">
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

export default Login;
