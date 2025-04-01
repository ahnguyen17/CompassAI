import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  isLoggedIn: boolean;
  authLoading: boolean; // Add loading state to prevent premature redirects
  // children?: React.ReactNode; // Alternative: Use children prop
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ isLoggedIn, authLoading }) => {
  if (authLoading) {
    // Show a loading indicator while checking auth status
    // Or return null/empty fragment to avoid rendering anything until check is complete
    return <div>Loading authentication...</div>;
  }

  if (!isLoggedIn) {
    // Redirect to login page if not logged in
    return <Navigate to="/login" replace />;
  }

  // Render the child route using Outlet if logged in
  return <Outlet />;
  // Alternative: return <>{children}</>;
};

export default ProtectedRoute;
