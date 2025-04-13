import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Import useNavigate and useLocation
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore'; // Import the store

// Define props interface
interface NavbarProps {
  isSidebarVisible: boolean;
  toggleSidebarVisibility: () => void;
}

const navbarHeight = 50; // Define navbar height for calculations and styling

const Navbar: React.FC<NavbarProps> = ({ isSidebarVisible, toggleSidebarVisibility }) => { // Accept props
  // Get state and actions from store
  const {
    isLoggedIn,
    currentUser,
    isDarkMode,
    handleLogout: storeLogout, // Rename to avoid conflict
    toggleTheme,
  } = useAuthStore();
  const navigate = useNavigate(); // Hook for navigation
  const location = useLocation(); // Hook for location

  const { t, i18n } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false); // State for language dropdown
  const langDropdownRef = useRef<HTMLDivElement>(null);
  // Removed isVisible state

  // Local logout handler to pass navigate
  const handleLogout = () => {
    storeLogout(navigate); // Call store action with navigate
    setIsDropdownOpen(false); // Close dropdown after logout
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    // Add listener only when dropdown is open
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    // Cleanup listener on component unmount or when dropdown closes
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]); // Re-run effect when user dropdown state changes

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutsideLang = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    if (isLangDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutsideLang);
    } else {
      document.removeEventListener('mousedown', handleClickOutsideLang);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideLang);
    };
  }, [isLangDropdownOpen]); // Re-run effect when language dropdown state changes

  // Removed scroll-based visibility effect

  // Common style for dropdown items
  const dropdownItemStyle: React.CSSProperties = {
    background: 'none', 
    border: 'none', 
    color: isDarkMode ? '#eee' : '#333', 
    padding: '8px 16px', 
    textDecoration: 'none',
    display: 'block',
    width: '100%', 
    textAlign: 'left', 
    cursor: 'pointer',
    fontSize: '1em', // Ensure consistent font size
    boxSizing: 'border-box'
  };

  return (
    <nav style={{
      background: '#333',
      color: '#fff',
      padding: '10px 20px', // Keep padding for internal spacing
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'fixed', // Keep navbar fixed
      top: '0', // Always at the top
      left: 0,
      right: 0,
      zIndex: 1000, // Ensure it's above other content
      // Removed transition
      // Removed marginBottom: '20px'
    }}>
      {/* Left side: Hamburger (conditional) + Logo */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* Hamburger Button - Show only on chat pages when logged in */}
        {isLoggedIn && (location.pathname === '/' || location.pathname.startsWith('/chat/')) && (
          <button
            onClick={toggleSidebarVisibility}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '1.2em', // Match other icons
              marginRight: '10px', // Reduced space before logo
              marginLeft: '-15px', // Pull button left into padding
              padding: '0 5px' // Minimal padding
            }}
            title={isSidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
            aria-label={isSidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
          >
            ☰
          </button>
        )}
        <Link to="/" style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <img src="/logo.png" alt={t('nav_title')} style={{ height: '30px', marginRight: '10px' }} />
        </Link>
      </div>

      {/* Right side: Theme, Language, Auth Links/Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* Theme Toggle Button */}
        <button
            onClick={toggleTheme}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2em', marginRight: '20px' }}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
            {isDarkMode ? '☀️' : '🌙'}
        </button>

        {/* Language Dropdown */}
        <div ref={langDropdownRef} style={{ position: 'relative', display: 'inline-block', marginRight: '20px' }}>
          <button 
            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2em' }}
            title="Change Language"
          >
            🌐
          </button>
          {isLangDropdownOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%', 
              backgroundColor: isDarkMode ? '#444' : '#f9f9f9',
              minWidth: '80px', // Adjust width as needed
              boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
              zIndex: 1,
              borderRadius: '4px',
              padding: '5px 0',
            }}>
              <button 
                onClick={() => { changeLanguage('en'); setIsLangDropdownOpen(false); }} 
                disabled={i18n.language === 'en'}
                style={{
                  ...dropdownItemStyle, // Spread the common styles
                  fontWeight: i18n.language === 'en' ? 'bold' : 'normal', // Add specific style
                }}
              >
                EN
              </button>
              <button
                onClick={() => { changeLanguage('vi'); setIsLangDropdownOpen(false); }}
                disabled={i18n.language === 'vi'}
                style={{
                  ...dropdownItemStyle, // Spread the common styles
                  fontWeight: i18n.language === 'vi' ? 'bold' : 'normal', // Add specific style
                }}
              >
                VI
              </button>
            </div>
          )}
        </div>

        {isLoggedIn ? (
          <>
            {/* User Dropdown */}
            <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
              <span 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                style={{ marginRight: '15px', color: '#ccc', cursor: 'pointer' }}
              >
                {currentUser?.username || currentUser?.email} ▼ {/* Add dropdown indicator */}
              </span>
              {isDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%', // Position below the username
                  backgroundColor: isDarkMode ? '#444' : '#f9f9f9',
                  minWidth: '120px',
                  boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
                  zIndex: 1,
                  borderRadius: '4px',
                  padding: '5px 0', // Add some padding
                }}>
                  {/* Settings Link inside Dropdown (Moved Up) */}
                  <Link 
                    to="/settings" 
                    onClick={() => setIsDropdownOpen(false)} // Close dropdown on click
                    style={dropdownItemStyle} // Apply common style
                  >
                    ⚙️ {t('nav_settings')} {/* Icon and Text */}
                   </Link>
                    <button
                     onClick={handleLogout} // Use the local handler
                     style={dropdownItemStyle} // Apply common style
                   >
                     🚪 {t('nav_logout')} {/* Add icon */}
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" style={{ color: '#fff', marginRight: '15px' }}>{t('nav_login')}</Link>
            <Link to="/register" style={{ color: '#fff' }}>{t('nav_register')}</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
