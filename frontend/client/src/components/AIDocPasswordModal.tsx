import React, { useState } from 'react';
import useAuthStore from '../store/authStore';

interface AIDocPasswordModalProps {
    onSuccess: () => void;
}

const AIDocPasswordModal: React.FC<AIDocPasswordModalProps> = ({ onSuccess }) => {
    const { isDarkMode } = useAuthStore();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Get password from localStorage or use default
        const storedPassword = localStorage.getItem('aiDocPassword') || 'CompassDoc';
        
        if (password === storedPassword) {
            // Store authentication in sessionStorage (expires when browser closes)
            sessionStorage.setItem('aiDocAuthenticated', 'true');
            onSuccess();
        } else {
            setError('Incorrect password. Please try again.');
            setPassword('');
        }
    };

    const modalOverlayStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
    };

    const modalContentStyle: React.CSSProperties = {
        backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff',
        color: isDarkMode ? '#e0e0e0' : '#333333',
        padding: '40px',
        borderRadius: '16px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        textAlign: 'center',
    };

    const iconStyle: React.CSSProperties = {
        fontSize: '48px',
        marginBottom: '20px',
    };

    const titleStyle: React.CSSProperties = {
        fontSize: '24px',
        fontWeight: '600',
        marginBottom: '10px',
        color: isDarkMode ? '#e0e0e0' : '#333333',
    };

    const subtitleStyle: React.CSSProperties = {
        fontSize: '14px',
        marginBottom: '30px',
        color: isDarkMode ? '#b0b0b0' : '#666666',
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        border: `2px solid ${error ? '#dc3545' : (isDarkMode ? '#444' : '#ddd')}`,
        backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
        color: isDarkMode ? '#e0e0e0' : '#333333',
        fontSize: '16px',
        marginBottom: '10px',
        textAlign: 'center',
        outline: 'none',
        transition: 'border-color 0.2s',
    };

    const errorStyle: React.CSSProperties = {
        color: '#dc3545',
        fontSize: '13px',
        marginBottom: '15px',
        minHeight: '20px',
    };

    const buttonStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#007bff',
        color: '#ffffff',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <div style={iconStyle}>🔒</div>
                <h2 style={titleStyle}>AIDoc Access</h2>
                <p style={subtitleStyle}>
                    This is a protected medical triage assistant. Please enter the password to continue.
                </p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setError('');
                        }}
                        placeholder="Enter password"
                        style={inputStyle}
                        autoFocus
                    />
                    <div style={errorStyle}>{error}</div>
                    <button
                        type="submit"
                        style={buttonStyle}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#0056b3';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#007bff';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        Access AIDoc
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AIDocPasswordModal;

