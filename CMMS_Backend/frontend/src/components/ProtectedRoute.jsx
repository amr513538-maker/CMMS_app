import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  
  if (loading) {
    return <div className="muted"><span className="spinner"></span> Loading...</div>;
  }
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
