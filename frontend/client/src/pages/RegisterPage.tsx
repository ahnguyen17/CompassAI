import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import hook
import apiClient from '../services/api';

// Define props interface
interface RegisterPageProps {
  onRegisterSuccess: () => void;
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
  const { t } = useTranslation(); // Get translation function

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Include referralCode in the request payload
      const response = await apiClient.post('/auth/register', { username, email, password, referralCode });

      if (response.data && response.data.success && response.data.token) {
        // Store the token
        localStorage.setItem('authToken', response.data.token);
        // Call the callback to update App state
        onRegisterSuccess();

        // Redirect to the main chat page
        navigate('/');
      } else {
        setError(response.data?.error || 'Registration failed.');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      // Handle specific errors like duplicate email/username
      if (err.response?.data?.error?.includes('duplicate key error')) {
          setError('Email or username already exists.');
      } else {
          setError(err.response?.data?.error || 'An error occurred during registration.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>{t('register_title')}</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">{t('register_username_label')}</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="email">{t('register_email_label')}</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">{t('register_password_label')}</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
         <div>
          <label htmlFor="confirmPassword">{t('register_confirm_password_label')}</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        {/* Add Referral Code Input */}
        <div>
          <label htmlFor="referralCode">{t('register_referral_label')}</label>
          <input
            type="text"
            id="referralCode"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>} {/* Keep errors in English or add keys */}
        <button type="submit" disabled={loading}>
          {loading ? t('register_registering') : t('register_button')}
        </button>
      </form>
      <p style={{ marginTop: '15px' }}>
        {t('register_have_account')} <Link to="/login">{t('register_login_link')}</Link>
      </p>
    </div>
  );
};

export default RegisterPage;
