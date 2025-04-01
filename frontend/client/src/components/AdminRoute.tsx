import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

// Re-use the CurrentUser interface definition (or import from a shared types file)
interface CurrentUser {
    _id: string;
    username: string;
    email: string;
    role: 'user' | 'admin';
    createdAt: string;
}

interface AdminRouteProps {
  isLoggedIn: boolean;
  authLoading: boolean;
  currentUser: CurrentUser | null;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ isLoggedIn, authLoading, currentUser }) => {
  if (authLoading) {
    // Show loading indicator while checking auth and user details
    return <div>Loading authentication...</div>;
  }

  if (!isLoggedIn) {
    // Redirect to login if not logged in
    return <Navigate to="/login" replace />;
  }

  if (currentUser?.role !== 'admin') {
    // Redirect to home page (or show an 'Unauthorized' page) if logged in but not admin
    console.warn('AdminRoute: User is not an admin. Redirecting.');
    return <Navigate to="/" replace />; // Redirect to home page
  }

  // Render the child route (SettingsPage) if logged in and admin
  return <Outlet />;
};

export default AdminRoute;
