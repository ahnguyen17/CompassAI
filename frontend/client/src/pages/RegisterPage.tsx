import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/api';
import styles from './RegisterPage.module.css'; // Import CSS module

// Define props interface
interface RegisterPageProps {
  onRegisterSuccess: () => void; // Callback for successful registration
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onRegisterSuccess }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState(''); // State for referral code
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
    }

    setLoading(true);

    try {
      // Include referralCode in the request body if it's provided
      const payload: any = { username, email, password };
      if (referralCode.trim()) {
          payload.referralCode = referralCode.trim();
      }

      const response = await apiClient.post('/auth/register', payload);

      if (response.data && response.data.success && response.data.token) {
        // Store the token (optional, depends if you want auto-login after register)
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('lastLoginIdentifier', email); // Store email as identifier
        // Call the callback
        onRegisterSuccess();
        // Redirect to the main chat page or login page
        navigate('/'); // Redirect to chat after successful registration
      } else {
        setError(response.data?.error || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.registerContainer}>
      <form onSubmit={handleSubmit} className={styles.registerForm}>
        <h2>{t('register_title')}</h2>
        <div className={styles.inputGroup}>
          <label htmlFor="username">{t('register_username_label')}</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="email">{t('register_email_label')}</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="password">{t('register_password_label')}</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="confirmPassword">{t('register_confirm_password_label')}</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
         <div className={styles.inputGroup}>
            <label htmlFor="referralCode">{t('register_referral_label')} ({t('optional')})</label>
            <input
                type="text"
                id="referralCode"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                autoComplete="off"
            />
        </div>
        {error && <p className={styles.errorMessage}>{error}</p>}
        <button type="submit" disabled={loading} className={styles.submitButton}>
          {loading ? t('register_registering') : t('register_button')}
        </button>
        <p className={styles.loginLink}>
            {t('register_already_account')} <Link to="/login">{t('register_login_link')}</Link>
        </p>
      </form>
    </div>
  );
};

export default RegisterPage;
