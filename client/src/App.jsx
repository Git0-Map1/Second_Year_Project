import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CustomerDashboard from "./pages/CustomerDashboard";
import SellerDashboard from "./pages/SellerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Properties from "./pages/Properties";
import PropertyDetails from "./pages/PropertyDetails";
import Booking from "./pages/Booking";
import PaymentFailed from "./pages/PaymentFailed";
import PaymentSuccess from "./pages/PaymentSuccess";
import PropertyForm from "./pages/PropertyForm";
import SellerApplication from "./pages/SellerApplication";
import Home from "./pages/Home";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/properties" element={<Properties />} />

        <Route
          path="/seller-application"
          element={
            <ProtectedRoute allowedRole="customer">
              <SellerApplication />
            </ProtectedRoute>
          }
        />

        <Route
          path="/properties/add"
          element={
            <ProtectedRoute allowedRole="seller">
              <PropertyForm />
            </ProtectedRoute>
          }
        />

        <Route
          path="/properties/edit/:id"
          element={
            <ProtectedRoute allowedRole="seller">
              <PropertyForm />
            </ProtectedRoute>
          }
        />

        <Route path="/properties/:id" element={<PropertyDetails />} />
        <Route path="/booking/:id" element={<Booking />} />
        <Route path="/payment-failed" element={<PaymentFailed />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />

        <Route
          path="/customer-dashboard"
          element={
            <ProtectedRoute allowedRole="customer">
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/seller-dashboard"
          element={
            <ProtectedRoute allowedRole="seller">
              <SellerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
