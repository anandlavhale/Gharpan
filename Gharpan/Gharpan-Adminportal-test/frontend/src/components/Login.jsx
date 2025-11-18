import React, { useState } from "react";
import { Eye, EyeOff, User, Lock, Leaf, Heart, Users } from "lucide-react";

function Login({ onLoginSuccess }) {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    adminId: "",
    password: "",
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.adminId.trim()) {
      alert("Please enter your Admin ID!");
      return;
    }

    if (!formData.password) {
      alert("Please enter your password!");
      return;
    }

    console.log("Form submitted:", formData);

    // Here you would typically make an API call
    // For demonstration, we'll simulate a successful login
    setTimeout(() => {
      alert("Login successful!");
      // Call the success callback to update parent state
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    }, 500);
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(135deg, #0A400C 0%, #0d5010 50%, #0A400C 100%)",
      }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute top-10 left-10 w-20 h-20 rounded-full"
          style={{ backgroundColor: "#FEFCF2" }}
        ></div>
        <div
          className="absolute top-32 right-20 w-16 h-16 rounded-full"
          style={{ backgroundColor: "#FEFCF2" }}
        ></div>
        <div
          className="absolute bottom-20 left-32 w-12 h-12 rounded-full"
          style={{ backgroundColor: "#FEFCF2" }}
        ></div>
        <div
          className="absolute bottom-32 right-10 w-24 h-24 rounded-full"
          style={{ backgroundColor: "#FEFCF2" }}
        ></div>
      </div>

      <div
        className="w-full max-w-6xl mx-auto flex rounded-3xl shadow-2xl overflow-hidden relative z-10"
        style={{ backgroundColor: "#FEFCF2" }}
      >
        {/* Left Side - Branding */}
        <div
          className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-center items-center text-white relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0A400C 0%, #0d5010 100%)",
          }}
        >
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="relative z-10 text-center">
            {/* Logo */}
            <div className="mb-8">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden"
                style={{ backgroundColor: "#FEFCF2" }}
              >
                <img
                  src="https://gharpanfoundation.org/images/logo.png"
                  alt="GHARPAN Logo"
                  className="w-20 h-20 object-contain"
                />
                <div className="relative hidden">
                  <Heart
                    className="w-12 h-12 absolute -top-1 -left-1"
                    style={{ color: "#0A400C" }}
                  />
                  <Leaf className="w-12 h-12" style={{ color: "#0A400C" }} />
                </div>
              </div>
              <h1
                className="text-4xl font-bold mb-2"
                style={{ color: "#FEFCF2" }}
              >
                GHARPAN
              </h1>
              <p style={{ color: "#e8f5e8" }}>
                RESTORING DIGNITY, ONE LIFE AT A TIME
              </p>
            </div>

            {/* Mission Statement */}
            <div className="space-y-6 max-w-md">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8" style={{ color: "#e8f5e8" }} />
                <p className="text-lg">Empowering Communities</p>
              </div>
              <div className="flex items-center space-x-3">
                <Leaf className="w-8 h-8" style={{ color: "#e8f5e8" }} />
                <p className="text-lg">Environmental Conservation</p>
              </div>
              <div className="flex items-center space-x-3">
                <Heart className="w-8 h-8" style={{ color: "#e8f5e8" }} />
                <p className="text-lg">Social Impact</p>
              </div>
            </div>

            <div
              className="mt-8 p-4 rounded-lg shadow-md"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.6)" }} // 60% opaque
            >
              <p className="text-sm text-green-900 text-center">
                "Together, we can create lasting change and build sustainable
                solutions for our planet and communities."
              </p>
            </div>
          </div>

          {/* Decorative Elements */}
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32"
            style={{ backgroundColor: "#FEFCF2", opacity: "0.05" }}
          ></div>
          <div
            className="absolute bottom-0 left-0 w-48 h-48 rounded-full -ml-24 -mb-24"
            style={{ backgroundColor: "#FEFCF2", opacity: "0.05" }}
          ></div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12">
          <div className="max-w-md mx-auto">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden shadow-lg"
                style={{ backgroundColor: "#FEFCF2" }}
              >
                <img
                  src="https://gharpanfoundation.org/images/logo.png"
                  alt="GHARPAN Logo"
                  className="w-12 h-12 object-contain"
                />
                <div className="relative hidden">
                  <Heart
                    className="w-8 h-8 absolute -top-0.5 -left-0.5"
                    style={{ color: "#0A400C" }}
                  />
                  <Leaf className="w-8 h-8" style={{ color: "#0A400C" }} />
                </div>
              </div>
              <h2 className="text-2xl font-bold" style={{ color: "#0A400C" }}>
                GHARPAN
              </h2>
              <p className="text-gray-600">Admin Portal</p>
            </div>

            {/* Form Header */}
            <div className="text-center mb-8">
              <h2
                className="text-3xl font-bold mb-2"
                style={{ color: "#000000" }}
              >
                Welcome Back
              </h2>
              <p className="text-gray-600">Access your admin dashboard</p>
            </div>

            {/* Form */}
            <div className="space-y-6">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#0A400C" }}
                >
                  Admin ID
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="adminId"
                    value={formData.adminId}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg outline-none transition-all"
                    style={{
                      backgroundColor: "#FEFCF2",
                      borderColor: "#d1d5db",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0A400C";
                      e.target.style.boxShadow =
                        "0 0 0 2px rgba(10, 64, 12, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.boxShadow = "none";
                    }}
                    placeholder="Enter your Admin ID (e.g., ADM123, GHP456)"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#0A400C" }}
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg outline-none transition-all"
                    style={{
                      backgroundColor: "#FEFCF2",
                      borderColor: "#d1d5db",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0A400C";
                      e.target.style.boxShadow =
                        "0 0 0 2px rgba(10, 64, 12, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.boxShadow = "none";
                    }}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                className="w-full bg-green-700 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-semibold focus:outline-none transform hover:scale-105 transition-all duration-200"
              >
                Sign In
              </button>
            </div>

            {/* Additional Info */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Secure admin access to GHARPAN Foundation system
              </p>
              <div className="mt-4 text-xs text-gray-400">
                <p>Admin ID format: Letters + Numbers (e.g., ADM123, GHP456)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

