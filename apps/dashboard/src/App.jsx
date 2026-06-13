import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import OverviewPage from './pages/OverviewPage';
import ComplaintMapPage from './pages/ComplaintMapPage';
import SafetyPage from './pages/SafetyPage';
import DemandPage from './pages/DemandPage';
import StationPage from './pages/StationPage';
import GrievancePortalPage from './pages/GrievancePortalPage';
import LiveHeatmapPage from './pages/LiveHeatmapPage';
import RPFDashboardPage from './pages/RPFDashboardPage';
import TatkalPage from './pages/TatkalPage';
import LoginPage from './pages/LoginPage';
import './index.css';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role'));

  const handleLogin = (newToken, userRole) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('role', userRole);
    setToken(newToken);
    setRole(userRole);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setToken(null);
    setRole(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        {!token ? (
          <Route path="*" element={<LoginPage onLogin={handleLogin} />} />
        ) : (
          <Route element={<DashboardLayout role={role} onLogout={handleLogout} />}>
            {role === 'admin' ? (
              <>
                <Route path="/" element={<OverviewPage />} />
                <Route path="/complaints" element={<ComplaintMapPage />} />
                <Route path="/safety" element={<SafetyPage />} />
                <Route path="/demand" element={<DemandPage />} />
                <Route path="/station" element={<StationPage />} />
                <Route path="/grievance" element={<GrievancePortalPage />} />
                <Route path="/heatmap" element={<LiveHeatmapPage />} />
                <Route path="/rpf" element={<RPFDashboardPage />} />
                <Route path="/tatkal" element={<TatkalPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            ) : (
              <>
                <Route path="/grievance" element={<GrievancePortalPage />} />
                <Route path="/heatmap" element={<LiveHeatmapPage />} />
                <Route path="*" element={<Navigate to="/grievance" replace />} />
              </>
            )}
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}

