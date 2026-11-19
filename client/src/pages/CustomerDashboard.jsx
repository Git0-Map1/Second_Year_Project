
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import LogoutButton from "../components/LogoutButton";

function CustomerDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const testAuth = async () => {
      try {
        const response = await api.get("/api/bookings/my-bookings");

        console.log("My Bookings:", response.data);
      } catch (error) {
        console.log("API Error:", error.response?.data || error.message);
      }
    };

    testAuth();
  }, []);

  return (
    <div>
      <h1>Welcome to Customer Dashboard</h1>

      <button onClick={() => navigate("/properties")}>
        Browse Properties
      </button>

      <LogoutButton />
    </div>
  );
}

export default CustomerDashboard;
