import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  console.log('ProtectedRoute: Token from localStorage:', token);
  console.log('ProtectedRoute: Token length:', token ? token.length : 0);
  console.log('ProtectedRoute: Token type:', typeof token);
  
  if (!token) {
    console.log('ProtectedRoute: No token found, redirecting to login');
    return <div className="text-center text-red-500 p-8">You are not authenticated. Please log in to access this page.</div>;
  }
  
  console.log('ProtectedRoute: Token found, rendering children');
  return children;
};

export default ProtectedRoute; 