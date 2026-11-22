
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CustomerDashboard from "./pages/CustomerDashboard";
import SellerDashboard from "./pages/SellerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import CustomerNavbar from "./components/CustomerNavbar";

import Properties from "./pages/Properties";
import PropertyDetails from "./pages/PropertyDetails";
import Booking from "./pages/Booking";
import PaymentFailed from "./pages/PaymentFailed";
import PaymentSuccess from "./pages/PaymentSuccess";
import PropertyForm from "./pages/PropertyForm";
import SellerApplication from "./pages/SellerApplication";
import Home from "./pages/Home";

// Layout with Customer Navbar
function CustomerLayout({ children }) {
  return (
    <>
      <CustomerNavbar />
      {children}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<CustomerLayout><Home /></CustomerLayout>}
        />

        <Route
          path="/login"
          element={<CustomerLayout><Login /></CustomerLayout>}
        />

        <Route
          path="/signup"
          element={<CustomerLayout><Signup /></CustomerLayout>}
        />

        <Route
          path="/properties"
          element={<CustomerLayout><Properties /></CustomerLayout>}
        />

        <Route
          path="/properties/:id"
          element={<CustomerLayout><PropertyDetails /></CustomerLayout>}
        />

        <Route
          path="/booking/:id"
          element={<CustomerLayout><Booking /></CustomerLayout>}
        />

        <Route
          path="/payment-failed"
          element={<CustomerLayout><PaymentFailed /></CustomerLayout>}
        />

        <Route
          path="/payment-success"
          element={<CustomerLayout><PaymentSuccess /></CustomerLayout>}
        />

        <Route
          path="/seller-application"
          element={
            <ProtectedRoute allowedRole="customer">
              <CustomerLayout>
                <SellerApplication />
              </CustomerLayout>
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

        <Route
          path="/customer-dashboard"
          element={
            <ProtectedRoute allowedRole="customer">
              <CustomerLayout>
                <CustomerDashboard />
              </CustomerLayout>
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
