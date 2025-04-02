import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/api';
import styles from './LoginPage.module.css'; // Revert to standard import

// Define props interface
interface LoginPageProps {
  onLoginSuccess: () => void;
  isDarkMode: boolean; // Add isDarkMode prop
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, isDarkMode }) => {
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Pre-fill identifier on mount
  useEffect(() => {
    const lastIdentifier = localStorage.getItem('lastLoginIdentifier');
    if (lastIdentifier) {
      setLoginIdentifier(lastIdentifier);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/login', { loginIdentifier, password });

      if (response.data && response.data.success && response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('lastLoginIdentifier', loginIdentifier);
        onLoginSuccess();
        navigate('/');
      } else {
        setError(response.data?.error || 'Login failed. Please check credentials.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <h2>{t('login_title')}</h2>
        <div className={styles.inputGroup}>
          <label htmlFor="loginIdentifier">{t('login_identifier_label')}</label>
          <input
            type="text"
            id="loginIdentifier"
            value={loginIdentifier}
            onChange={(e) => setLoginIdentifier(e.target.value)}
            required
            autoComplete="username"
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="password">{t('login_password_label')}</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        {error && <p className={styles.errorMessage}>{error}</p>}
        <button type="submit" disabled={loading} className={styles.submitButton}>
          {loading ? t('login_logging_in') : t('login_button')}
        </button>
         <p className={styles.registerLink}>
            {t('login_no_account')} <Link to="/register">{t('login_register_link')}</Link>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;
