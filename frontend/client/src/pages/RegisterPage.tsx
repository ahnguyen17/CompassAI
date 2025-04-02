import React, { useState, useEffect } from 'react'; // Import useEffect
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/api';
import styles from './RegisterPage.module.css';

interface RegisterPageProps {
  onRegisterSuccess: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onRegisterSuccess }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isReferralRequired, setIsReferralRequired] = useState<boolean | null>(null); // null = loading, true/false = status
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Fetch referral code status on mount
  useEffect(() => {
    const checkReferralStatus = async () => {
      try {
        const response = await apiClient.get('/referralcodes/status');
        if (response.data?.success) {
          setIsReferralRequired(response.data.isRequired);
        } else {
          console.error('Failed to fetch referral status, assuming not required.');
          setIsReferralRequired(false); // Default to not required on error
        }
      } catch (err) {
        console.error('Error fetching referral status:', err);
        setIsReferralRequired(false); // Default to not required on error
      }
    };
    checkReferralStatus();
  }, []); // Empty dependency array means run once on mount

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
    // Check if referral is required and not provided
    if (isReferralRequired === true && !referralCode.trim()) {
        setError('Referral code is required.');
        return;
    }

    setLoading(true);

    try {
      const payload: any = { username, email, password };
      // Only include referralCode if it's required and has a value
      if (isReferralRequired && referralCode.trim()) {
          payload.referralCode = referralCode.trim();
      }

      const response = await apiClient.post('/auth/register', payload);

      if (response.data && response.data.success && response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('lastLoginIdentifier', email);
        onRegisterSuccess();
        navigate('/');
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

  // Don't render the form until we know the referral status
  if (isReferralRequired === null) {
      return <div>Loading registration form...</div>; // Or a spinner
  }

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
        {/* Conditionally render referral code input */}
        {isReferralRequired && (
            <div className={styles.inputGroup}>
                <label htmlFor="referralCode">{t('register_referral_label')} ({t('optional')})</label> {/* Keep using 'optional' key which now means 'required' */}
                <input
                    type="text"
                    id="referralCode"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    required={isReferralRequired} // Make input required only if needed
                    autoComplete="off"
                />
            </div>
        )}
        {error && <p className={styles.errorMessage}>{error}</p>}
        <button type="submit" disabled={loading} className={styles.submitButton}>
          {loading ? t('register_registering') : t('register_button')}
        </button>
        <p className={styles.loginLink}>
            {t('register_have_account')} <Link to="/login">{t('register_login_link')}</Link>
        </p>
      </form>
    </div>
  );
};

export default RegisterPage;
