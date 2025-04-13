import React, { useState } from 'react'; // Added useState
import { Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import useAuthStore from './store/authStore'; // Import the Zustand store

// --- Import Components ---
import Navbar from './components/Navbar';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SettingsPage from './pages/SettingsPage';
import SharedChatPage from './pages/SharedChatPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute'; // Import AdminRoute
// Removed apiClient import, handled in store

// Removed CurrentUser interface, defined in store

// --- App Component ---

const navbarHeight = 50; // Same height as defined in Navbar.tsx

function App() {
  // Sidebar State
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const toggleSidebarVisibility = () => setIsSidebarVisible(!isSidebarVisible);

  // Get state and actions from Zustand store
  const {
    isLoggedIn,
    currentUser,
    authLoading,
    isDarkMode,
    handleLogout: storeLogout, // Rename to avoid conflict with navigate
    handleAuthSuccess,
    toggleTheme,
  } = useAuthStore();

  const navigate = useNavigate();

  // Wrapper for logout to include navigation
  const handleLogout = () => {
    storeLogout(navigate); // Pass navigate to the store action
  };

  // Removed local state declarations
  // Removed fetchCurrentUser function
  // Removed useEffect hooks for auth and theme (handled in store)
  // Removed local handleLogout, handleAuthSuccess, toggleTheme functions

  // Show loading indicator until auth check is complete (from store)
  if (authLoading) {
      return <div>Loading...</div>; // Or a proper spinner component
  }

  return (
    // Add paddingTop to account for the fixed navbar height
    <div className="app-container" style={{ paddingTop: `${navbarHeight}px` }}>
      {/* Pass sidebar state and toggle function to Navbar */}
      <Navbar isSidebarVisible={isSidebarVisible} toggleSidebarVisibility={toggleSidebarVisibility} />
      <Routes>
         {/* Public Routes */}
         {/* LoginPage now uses the store directly */}
        <Route path="/login" element={<LoginPage />} />
        {/* RegisterPage now uses the store directly */}
        <Route path="/register" element={<RegisterPage />} />
        {/* SharedChatPage now uses the store directly */}
        <Route path="/share/:shareId" element={<SharedChatPage />} />

         {/* Protected Routes (General Login Required) */}
         {/* ProtectedRoute will now internally use useAuthStore */}
         <Route element={<ProtectedRoute />}>
             {/* Pass sidebar state and toggle function to ChatPage */}
             <Route path="/" element={<ChatPage isSidebarVisible={isSidebarVisible} toggleSidebarVisibility={toggleSidebarVisibility} />} />
             <Route path="/chat/:sessionId" element={<ChatPage isSidebarVisible={isSidebarVisible} toggleSidebarVisibility={toggleSidebarVisibility} />} />
             {/* SettingsPage will now internally use useAuthStore */}
             <Route path="/settings" element={<SettingsPage />} />
         </Route>

         {/* Admin Protected Route - Can be removed if no other admin-only routes exist */}
         {/* AdminRoute will now internally use useAuthStore */}
         {/* <Route element={<AdminRoute />}> */}
             {/* Add any future admin-only routes here */}
         {/* </Route> */}

        {/* Catch-all for Not Found */}
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </div>
  );
}

export default App;
