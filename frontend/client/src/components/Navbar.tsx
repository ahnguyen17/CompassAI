import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MdLanguage, MdOutlineDarkMode, MdOutlineLightMode, MdSettings, MdLogout, MdAddComment, MdOutlineKeyboardArrowDown } from 'react-icons/md'; // Import icons
import useAuthStore from '../store/authStore';
import styles from './Navbar.module.css'; // Import CSS module

// Define props interface
interface NavbarProps {
  isSidebarVisible: boolean;
  toggleSidebarVisibility: () => void;
}

// const navbarHeight = 50; // Height is now controlled by CSS

const Navbar: React.FC<NavbarProps> = ({ isSidebarVisible, toggleSidebarVisibility }) => {
  const {
    isLoggedIn,
    currentUser,
    isDarkMode,
    handleLogout: storeLogout,
    toggleTheme,
    startNewChat,
  } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    storeLogout(navigate);
    setIsUserDropdownOpen(false);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsLangDropdownOpen(false);
  };

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    if (isUserDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserDropdownOpen]);

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
  }, [isLangDropdownOpen]);

  const getDropdownItemClassName = (isActive: boolean) => {
    return `${styles.dropdownItem} ${isActive ? styles.active : ''}`;
  };

  return (
    <nav className={styles.navbar}>
      {/* Left side: Logo (conditionally toggles sidebar) + New Chat Icon */}
      <div className={styles.leftSection}>
        <Link
          to="/"
          className={styles.logoLink}
          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
            if (isLoggedIn && (location.pathname === '/' || location.pathname.startsWith('/chat/'))) {
              e.preventDefault();
              toggleSidebarVisibility();
            }
          }}
        >
          <img src="/logo.png" alt={t('nav_title')} className={styles.logoImage} />
        </Link>
        {isLoggedIn && (
          <button
            onClick={() => startNewChat(navigate)}
            title={t('nav_new_chat') || "New Chat"} // Use translation key
            aria-label="Start New Chat"
            className={`${styles.iconButton} ${styles.newChatButton}`}
          >
            <MdAddComment />
          </button>
        )}
      </div>

      {/* Right side: Language, Theme, Auth Links/Dropdown */}
      <div className={styles.rightSection}>
        {/* Language Dropdown */}
        <div ref={langDropdownRef} className={styles.dropdownContainer}>
          <button
            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
            className={styles.iconButton}
            title="Change Language"
          >
            <MdLanguage />
          </button>
          {isLangDropdownOpen && (
            <div className={`${styles.dropdown} ${styles.langDropdown}`}>
              <button
                onClick={() => changeLanguage('en')}
                disabled={i18n.language === 'en'}
                className={getDropdownItemClassName(i18n.language === 'en')}
              >
                EN
              </button>
              <button
                onClick={() => changeLanguage('vi')}
                disabled={i18n.language === 'vi'}
                className={getDropdownItemClassName(i18n.language === 'vi')}
              >
                VI
              </button>
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={styles.iconButton}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <MdOutlineLightMode /> : <MdOutlineDarkMode />}
        </button>

        {isLoggedIn ? (
          <>
            {/* User Dropdown */}
            <div ref={userDropdownRef} className={styles.dropdownContainer}>
              <span
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className={styles.userDisplay}
              >
                {currentUser?.username || currentUser?.email}
                <MdOutlineKeyboardArrowDown /> {/* Dropdown indicator icon */}
              </span>
              {isUserDropdownOpen && (
                <div className={styles.dropdown}>
                  <Link
                    to="/settings"
                    onClick={() => setIsUserDropdownOpen(false)}
                    className={styles.dropdownItem}
                  >
                    <MdSettings /> {t('nav_settings')}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className={styles.dropdownItem}
                  >
                    <MdLogout /> {t('nav_logout')}
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className={styles.authLink}>{t('nav_login')}</Link>
            <Link to="/register" className={styles.authLink}>{t('nav_register')}</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
