import React, { useState, useRef, useEffect } from 'react'; // Import useState, useRef, useEffect
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import useTranslation hook

// Re-use or import CurrentUser interface
interface CurrentUser {
    _id: string;
    username: string;
    email: string;
    role: 'user' | 'admin';
    createdAt: string;
}

// Define props interface
interface NavbarProps {
  isLoggedIn: boolean;
  currentUser: CurrentUser | null;
  onLogout: () => void;
  isDarkMode: boolean; // Add dark mode state
  toggleTheme: () => void; // Add toggle function
}

const Navbar: React.FC<NavbarProps> = ({ isLoggedIn, currentUser, onLogout, isDarkMode, toggleTheme }) => {
  const { t, i18n } = useTranslation(); // Get t function and i18n instance
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // State for user dropdown
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref for user dropdown container
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false); // State for language dropdown
  const langDropdownRef = useRef<HTMLDivElement>(null); // Ref for language dropdown container

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng); // Change the language
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

  return (
    <nav style={{ background: '#333', color: '#fff', padding: '10px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontSize: '1.2em' }}>
        {t('nav_title')}
      </Link>
      <div style={{ display: 'flex', alignItems: 'center' }}> {/* Container for right-side items */}
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
                  background: 'none', 
                  border: 'none', 
                  color: isDarkMode ? '#eee' : '#333', 
                  padding: '8px 16px', 
                  textDecoration: 'none',
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: i18n.language === 'en' ? 'bold' : 'normal' // Highlight current language
                }}
              >
                EN
              </button>
              <button 
                onClick={() => { changeLanguage('vi'); setIsLangDropdownOpen(false); }} 
                disabled={i18n.language === 'vi'}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: isDarkMode ? '#eee' : '#333', 
                  padding: '8px 16px', 
                  textDecoration: 'none',
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: i18n.language === 'vi' ? 'bold' : 'normal' // Highlight current language
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
                  <button 
                    onClick={() => { onLogout(); setIsDropdownOpen(false); }} 
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: isDarkMode ? '#eee' : '#333', 
                      padding: '8px 16px', // Consistent padding
                      textDecoration: 'none',
                      display: 'block',
                      width: '100%', // Make button fill width
                      textAlign: 'left', // Align text left
                      cursor: 'pointer' 
                    }}
                  >
                    {t('nav_logout')}
                  </button>
                  {/* Settings Link inside Dropdown */}
                  <Link 
                    to="/settings" 
                    onClick={() => setIsDropdownOpen(false)} // Close dropdown on click
                    style={{ 
                      color: isDarkMode ? '#eee' : '#333', 
                      padding: '8px 16px', 
                      textDecoration: 'none',
                      display: 'block',
                      width: '100%', // Make link fill width
                      textAlign: 'left', // Align text left
                      boxSizing: 'border-box' // Ensure padding is included in width
                    }}
                  >
                    ⚙️ {t('nav_settings')} {/* Icon and Text */}
                  </Link>
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
