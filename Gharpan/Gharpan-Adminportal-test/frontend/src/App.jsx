// App.jsx
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import Navbar from './components/navbar';
import './App.css';
import RegistrationForm from './components/registration-form';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';
import Login from './components/Login';
import ResidentListing from './components/resident-listing';
import CareTracking from './components/Caretracking';
import '@fortawesome/fontawesome-free/css/all.min.css';

// 🔥 Import ProtectedRoute
import ProtectedRoute from "./utils/ProtectedRoute";

// 🔥 Add ScrollToTop import
import ScrollToTop from "./ScrollToTop";

// Wrapper to use useNavigate in a functional component
function LoginWithRedirect() {
  const navigate = useNavigate();
  const handleLoginSuccess = () => {
    navigate('/dashboard'); // Redirect to dashboard after login
  };
  return <Login onLoginSuccess={handleLoginSuccess} />;
}

// Layout wrapper to hide Navbar/Footer on login page
function AppLayout() {
  const location = useLocation();
  const hideLayout = location.pathname === '/';

  return (
    <>
      {!hideLayout && <Navbar />}

      <Routes>
        {/* Login Page */}
        <Route path="/" element={<LoginWithRedirect />} />

        {/* 🔐 Protected Pages */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/register"
          element={
            <ProtectedRoute>
              <RegistrationForm />
            </ProtectedRoute>
          }
        />

        <Route
          path="/listings"
          element={
            <ProtectedRoute>
              <ResidentListing />
            </ProtectedRoute>
          }
        />

        <Route
          path="/care-tracking"
          element={
            <ProtectedRoute>
              <CareTracking />
            </ProtectedRoute>
          }
        />
      </Routes>

      {!hideLayout && <Footer />}
    </>
  );
}

function App() {
  return (
    <Router>

      {/* 🔥 put here */}
      <ScrollToTop />

      <AppLayout />
    </Router>
  );
}

export default App;
