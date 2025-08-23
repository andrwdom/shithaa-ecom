import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, token }) => {
  if (!token || token === 'undefined' || token.trim() === '') {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

export default ProtectedRoute;