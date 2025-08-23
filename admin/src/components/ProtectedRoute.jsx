import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, token }) => {
  console.log('ProtectedRoute: Token from props:', token);
  console.log('ProtectedRoute: Token length:', token ? token.length : 0);
  console.log('ProtectedRoute: Token type:', typeof token);
  
  if (!token || token === 'undefined' || token.trim() === '') {
    console.log('ProtectedRoute: No valid token found, redirecting to login');
    return <Navigate to="/" replace />;
  }
  
  console.log('ProtectedRoute: Valid token found, rendering children');
  return children;
};

export default ProtectedRoute; 