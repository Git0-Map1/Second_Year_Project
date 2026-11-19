import { replace, useNavigate } from "react-router-dom";

function LogoutButton(){
    const navigate = useNavigate();

    const handleLogout = () =>{
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/login", {replace: true});
    }
    return(
        <button onClick={handleLogout}>
            Logout
        </button>
    )
}

export default LogoutButton;