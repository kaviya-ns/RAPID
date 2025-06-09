// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import MapViewer from './components/MapViewer';
import Resources from './components/Resources';
import Response from './components/Response';

// Role-based wrapper component
const RoleRoute = ({ children, allowedRoles }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        <Route path="/map" element={
          <RoleRoute allowedRoles={['admin', 'command']}>
            <MapViewer />
          </RoleRoute>
        } />
        
        <Route path="/resources" element={
          <RoleRoute allowedRoles={['admin', 'command', 'field']}>
            <Resources />
          </RoleRoute>
        } />
        
        <Route path="/response" element={
          <RoleRoute allowedRoles={['admin', 'command', 'field']}>
            <Response />
          </RoleRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;