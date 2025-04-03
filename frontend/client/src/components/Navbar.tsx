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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // State for dropdown
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref for dropdown container

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
  }, [isDropdownOpen]); // Re-run effect when isDropdownOpen changes

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

         {/* Language Toggle Buttons */}
         <button onClick={() => changeLanguage('en')} disabled={i18n.language === 'en'} style={{ background: 'none', border: i18n.language === 'en' ? '1px solid #fff' : 'none', color: '#fff', cursor: 'pointer', marginRight: '5px', padding: '3px 6px', borderRadius: '3px' }}>EN</button>
         <button onClick={() => changeLanguage('vi')} disabled={i18n.language === 'vi'} style={{ background: 'none', border: i18n.language === 'vi' ? '1px solid #fff' : 'none', color: '#fff', cursor: 'pointer', marginRight: '20px', padding: '3px 6px', borderRadius: '3px' }}>VI</button>

        {isLoggedIn ? (
          <>
            {/* Show Settings link as an icon */}
            <Link 
              to="/settings" 
              style={{ color: '#fff', marginRight: '15px', textDecoration: 'none', fontSize: '1.2em' }} 
              title={t('nav_settings')} // Add title for accessibility
            >
              ⚙️
            </Link>
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
                  {/* Add other dropdown items here if needed */}
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
