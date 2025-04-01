import React from 'react';
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

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng); // Change the language
  };

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
            {/* Conditionally render Settings link for admins */}
            {currentUser?.role === 'admin' && (
                <Link to="/settings" style={{ color: '#fff', marginRight: '15px' }}>{t('nav_settings')}</Link>
            )}
            <span style={{ marginRight: '15px', color: '#ccc' }}>{currentUser?.username || currentUser?.email}</span>
            <button onClick={onLogout} style={{ background: 'none', border: '1px solid #fff', color: '#fff', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>{t('nav_logout')}</button>
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
