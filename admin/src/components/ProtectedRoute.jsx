import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  console.log('ProtectedRoute token:', token);
  
  if (!token) {
    return <div className="text-center text-red-500 p-8">You are not authenticated. Please log in to access this page.</div>;
  }
  
  return children;
};

export default ProtectedRoute; 