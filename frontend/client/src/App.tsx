import React, { useState, useEffect } from 'react'; // Import useState, useEffect
import { Routes, Route, useNavigate } from 'react-router-dom'; // Import useNavigate
import './App.css';

// --- Import Components ---
import Navbar from './components/Navbar';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SettingsPage from './pages/SettingsPage';
import SharedChatPage from './pages/SharedChatPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute'; // Import AdminRoute
import apiClient from './services/api';

// Define User interface matching backend (excluding password)
interface CurrentUser {
    _id: string;
    username: string;
    email: string;
    role: 'user' | 'admin';
    createdAt: string;
}

// --- App Component ---

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  // --- Dark Mode State ---
  const [isDarkMode, setIsDarkMode] = useState(() => {
      // Initialize state from localStorage or default to false (light mode)
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
  });
  const navigate = useNavigate();

  // Fetch current user details if token exists
  const fetchCurrentUser = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
          try {
              // apiClient interceptor already adds the token to headers
              const response = await apiClient.get('/auth/me');
              if (response.data?.success) {
                  setCurrentUser(response.data.data);
                  setIsLoggedIn(true);
              } else {
                  // Token might be invalid/expired
                  handleLogout(); // Log out if /me fails
              }
          } catch (error) {
              console.error("Error fetching current user:", error);
              handleLogout(); // Log out on error
          }
      } else {
          setIsLoggedIn(false);
          setCurrentUser(null);
      }
      setAuthLoading(false); // Finished auth check
  };

  // Check login status on initial load
  // --- Effects ---
  useEffect(() => {
      fetchCurrentUser(); // Check auth status on load
  }, []);

  // Effect to apply dark mode class to body and save preference
  useEffect(() => {
      if (isDarkMode) {
          document.body.classList.add('dark');
          localStorage.setItem('darkMode', 'true');
      } else {
          document.body.classList.remove('dark');
          localStorage.setItem('darkMode', 'false');
      }
  }, [isDarkMode]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsLoggedIn(false);
    setCurrentUser(null); // Clear user data
    navigate('/login'); // Redirect to login after logout
  };

  // Callback for login/register success
  const handleAuthSuccess = () => {
      setIsLoggedIn(true);
      fetchCurrentUser();
  };

  // Toggle dark mode
  const toggleTheme = () => {
      setIsDarkMode(prevMode => !prevMode);
  };

  // Note: A more robust solution would use React Context or Zustand

  // Show loading indicator until auth check is complete
  if (authLoading) {
      return <div>Loading...</div>; // Or a proper spinner component
  }

  return (
    <div className="app-container">
      {/* Pass theme state and toggle function to Navbar */}
      <Navbar isLoggedIn={isLoggedIn} currentUser={currentUser} onLogout={handleLogout} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      <Routes>
         {/* Public Routes */}
        <Route path="/login" element={<LoginPage onLoginSuccess={handleAuthSuccess} />} />
        <Route path="/register" element={<RegisterPage onRegisterSuccess={handleAuthSuccess} />} />
        <Route path="/share/:shareId" element={<SharedChatPage />} />

         {/* Protected Routes (General Login Required) */}
         <Route element={<ProtectedRoute isLoggedIn={isLoggedIn} authLoading={authLoading} />}>
             <Route path="/" element={<ChatPage />} />
             <Route path="/chat/:sessionId" element={<ChatPage />} />
             {/* Settings route is now nested under AdminRoute */}
         </Route>

         {/* Admin Protected Route */}
         <Route element={<AdminRoute isLoggedIn={isLoggedIn} authLoading={authLoading} currentUser={currentUser} />}>
             <Route path="/settings" element={<SettingsPage currentUser={currentUser} />} />
         </Route>

        {/* Catch-all for Not Found */}
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </div>
  );
}

export default App;
