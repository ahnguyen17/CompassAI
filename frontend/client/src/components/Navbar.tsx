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
    startNewChat, // Import the new action
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
      {/* Left side: Logo (conditionally toggles sidebar) + New Chat Icon */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* Logo Link - Conditionally toggles sidebar or navigates home */}
        <Link 
          to="/" 
          style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={(e) => {
            // Only toggle sidebar if logged in and on a chat page
            if (isLoggedIn && (location.pathname === '/' || location.pathname.startsWith('/chat/'))) {
              e.preventDefault(); // Prevent navigation
              toggleSidebarVisibility(); // Toggle the sidebar
            }
            // Otherwise, allow default navigation to '/'
          }}
        >
          <img src="/logo.png" alt={t('nav_title')} style={{ height: '30px', marginRight: '10px' }} />
        </Link>
        {/* New Chat Icon Button - Show only when logged in */}
        {isLoggedIn && (
          <button
            onClick={() => startNewChat(navigate)}
            title="New Chat"
            aria-label="Start New Chat"
            style={{
              background: 'none',
              border: 'none',
              color: '#fff', // Sets SVG stroke color via currentColor
              cursor: 'pointer',
              padding: '0', // Remove padding
              marginLeft: '10px', // Space after logo
              display: 'flex', // Align SVG vertically
              alignItems: 'center',
              justifyContent: 'center',
              height: '30px', // Match logo height for alignment
              width: '30px' // Match logo height for alignment
            }}
          >
            {/* Prepared SVG Icon */}
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: '24px', width: '24px' }}>
              <path d="M12 4V4C16.4183 4 20 7.58172 20 12V17.0909C20 17.9375 20 18.3608 19.8739 18.6989C19.6712 19.2425 19.2425 19.6712 18.6989 19.8739C18.3608 20 17.9375 20 17.0909 20H12C7.58172 20 4 16.4183 4 12V12" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M9 11L15 11" stroke="currentColor" strokeOpacity="0.24" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 8L5 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 5L8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 15H15" stroke="currentColor" strokeOpacity="0.24" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Right side: Language, Theme, Auth Links/Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
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

        {/* Theme Toggle Button */}
        <button
            onClick={toggleTheme}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2em', marginRight: '20px' }}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
            {isDarkMode ? '☀️' : '🌙'}
        </button>

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
