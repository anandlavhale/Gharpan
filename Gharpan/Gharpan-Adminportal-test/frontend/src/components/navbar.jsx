import React from 'react';
import './navbar.css';
import logo from '../images/image1.jpg';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");   // Clear login token
    navigate("/");                      // Redirect to login page
  };

  return (
    <nav className="navbar navbar-expand-lg fixed-top shadow-lg">
      <div className="container-fluid px-4 d-flex justify-content-between align-items-center">

        {/* Left Side Logo */}
        <Link to="/dashboard" className="navbar-brand d-flex align-items-center">
          <img src={logo} alt="Logo" className="logo me-3" />
          <span className="brand-text fw-bold fs-5">Gharpan Organisation</span>
        </Link>

        {/* Right Side Logout Button */}
        <button
          className="logout-btn"
          onClick={handleLogout}
        >
          Logout
        </button>

      </div>
    </nav>
  );
}

export default Navbar;
