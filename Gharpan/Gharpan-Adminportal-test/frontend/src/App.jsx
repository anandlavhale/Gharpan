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
import ResidentListing from './components/resident-listing'; // ✅ Imported your listing component
import CareTracking from './components/Caretracking';
import '@fortawesome/fontawesome-free/css/all.min.css';


// Wrapper to use useNavigate in a functional component
function LoginWithRedirect() {
  const navigate = useNavigate();
  const handleLoginSuccess = () => {
    navigate('/dashboard'); // Redirect to dashboard after login
  };
  return <Login onLoginSuccess={handleLoginSuccess} />;
}

// Layout wrapper to conditionally show Navbar and Footer
function AppLayout() {
  const location = useLocation();
  const hideLayout = location.pathname === '/'; // Hide on login page

  return (
    <>
      {!hideLayout && <Navbar />}
      <Routes>
        <Route path="/" element={<LoginWithRedirect />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/register" element={<RegistrationForm />} />
        <Route path="/listings" element={<ResidentListing />} /> {/* ✅ Added this */}
        <Route path="/care-tracking" element={<CareTracking />} />
      </Routes>
      {!hideLayout && <Footer />}
    </>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
