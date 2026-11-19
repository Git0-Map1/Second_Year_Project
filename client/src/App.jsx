import { BrowserRouter, Routes, Route, Navigate} from "react-router-dom";


import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CustomerDashboard from "./pages/CustomerDashboard";
import SellerDashboard from "./pages/SellerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Properties from "./pages/Properties";
import PropertyDetails from "./pages/PropertyDetails";
import Booking from "./pages/Booking";

function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login"/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/signup" element={<Signup/>}/>
        <Route path="/properties" element={<Properties/>}/>
        <Route path="/properties/:id" element={<PropertyDetails/>}/>
        <Route path="/booking/:id" element={<Booking />}></Route>

        <Route path="/customer-dashboard" element={
          <ProtectedRoute allowedRole="customer">
            <CustomerDashboard/>
          </ProtectedRoute>}/>

        <Route path="/seller-dashboard" element={
          <ProtectedRoute allowedRole="seller">
            <SellerDashboard/>
          </ProtectedRoute>}/>

        <Route path="/admin-dashboard" element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard/>
            </ProtectedRoute>}/>
      </Routes>
    </BrowserRouter>
  )
}

export default App;