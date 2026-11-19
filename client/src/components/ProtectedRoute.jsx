import { Navigate } from "react-router-dom";

function ProtectedRoute({children, allowedRole}){

    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    //check whether the user is logged in
    if(!token || !user){
        return <Navigate to="/login" replace />
    }

    //check whether the user's role is authorized
    if(user.role !== allowedRole){
        return <Navigate to= "/login" replace />
    }
    return children
}

export default ProtectedRoute;
