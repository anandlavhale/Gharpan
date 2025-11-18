import React from "react";
import "./Footer.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

function Footer() {
  return (
    <footer
      className="footer text-white pt-5"
      style={{ background: "#0A400C" }}
    >
      <div className="container">
        <div className="row text-center text-md-start">
          {/* Contact Section */}
          <div className="col-md-6 mb-4">
            <h5 className="footer-title">Contact Us</h5>
            <p className="footer-text mb-1">
              <i className="fa fa-map-marker me-2"></i>
              S.No 122/1, Pride World City, Charholi Budruk,
              <br />
              Near Pathare Chowk, Pimpri-Chinchwad,
              <br />
              District Pune, 412105
            </p>
            <p className="footer-text mb-1">
              <i className="fa fa-phone me-2"></i>
              +91 7720046640
            </p>
            <p className="footer-text">
              <i className="fa fa-envelope me-2"></i>
              connect@gharpanfoundation.org
            </p>
          </div>

          {/* Optional Social or About Section */}
          <div className="col-md-6 mb-4">
            <h5 className="footer-title">About Gharpan</h5>
            <p className="footer-text">
              Gharpan Foundation is committed to holistic rehabilitation and
              care for individuals in need. Join us in making a difference.
            </p>
          </div>
        </div>

        <hr className="bg-light" />

        <p className="text-center mb-0 pb-3">
          © 2025 Gharpan Foundation. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;

