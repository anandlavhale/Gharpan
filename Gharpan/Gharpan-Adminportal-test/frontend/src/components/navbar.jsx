import React from 'react';
import './navbar.css';
import logo from '../images/image1.jpg';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg fixed-top shadow-lg">
      <div className="container-fluid px-4">
        <Link to="/dashboard" className="navbar-brand d-flex align-items-center justify-content-center">
          <img src={logo} alt="Logo" className="logo me-3" />
          <span className="brand-text fw-bold fs-5">Gharpan Organisation</span>
        </Link>

        {/* REMOVE: Toggler button and collapse logic */}

        
      </div>
    </nav>
  );
}

export default Navbar;

