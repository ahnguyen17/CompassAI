import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { useTranslation } from 'react-i18next';
import apiClient, { ApiResponse, MonthlyStat, AllTimeStat } from '../services/api'; // Import new types
import useAuthStore from '../store/authStore'; // Import the store

// Interfaces
interface ApiKey {
  _id: string;
  providerName: string;
  keyValue: string;
  isEnabled: boolean;
  createdAt: string;
  lastUpdatedAt: string;
  priority: number;
}

interface User {
    _id: string;
    username: string;
    email: string;
    createdAt: string;
    role: 'user' | 'admin';
}

interface ReferralCode {
    _id: string;
    code: string;
    description?: string;
    createdAt: string;
}

// Add interface for Model Status
interface ModelStatus {
    modelName: string;
    isDisabled: boolean;
}

// Removed SettingsPageProps interface

// Helper to get month name
const getMonthName = (monthNumber: number, locale: string = 'en-US'): string => {
    const date = new Date();
    date.setMonth(monthNumber - 1); // Month is 0-indexed in JS Date
    return date.toLocaleString(locale, { month: 'long' });
};


const SettingsPage: React.FC = () => { // Removed props
  const { currentUser, isDarkMode } = useAuthStore(); // Get state from store
  const { t } = useTranslation();

  // API Key State
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(true);
  const [fetchApiKeysError, setFetchApiKeysError] = useState('');
  const [addApiKeyError, setAddApiKeyError] = useState('');
  const [addApiKeyLoading, setAddApiKeyLoading] = useState(false);
  const [apiKeyActionError, setApiKeyActionError] = useState('');
  const [apiKeyActionLoading, setApiKeyActionLoading] = useState<string | null>(null);
  const [newProviderName, setNewProviderName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [editingApiKeyId, setEditingApiKeyId] = useState<string | null>(null);
  const [editPriorityValue, setEditPriorityValue] = useState<number>(99);

  // User Management State (Admin)
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [fetchUsersError, setFetchUsersError] = useState('');
  const [userActionError, setUserActionError] = useState(''); // General user action errors
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null); // For edit/delete/create
  const [newUsername, setNewUsername] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
  const [adminResetPwdLoading, setAdminResetPwdLoading] = useState<string | null>(null);
  const [adminResetPwdError, setAdminResetPwdError] = useState('');

  // Model Visibility State (Admin) - ADDED
  const [modelStatuses, setModelStatuses] = useState<ModelStatus[]>([]);
  const [loadingModelStatuses, setLoadingModelStatuses] = useState(true);
  const [fetchModelStatusError, setFetchModelStatusError] = useState('');
  const [modelActionLoading, setModelActionLoading] = useState<string | null>(null);
  const [modelActionError, setModelActionError] = useState('');

  // Referral Code State (Admin)
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [loadingReferralCodes, setLoadingReferralCodes] = useState(true);
  const [fetchReferralCodesError, setFetchReferralCodesError] = useState('');
  const [addReferralCodeError, setAddReferralCodeError] = useState('');
  const [addReferralCodeLoading, setAddReferralCodeLoading] = useState(false);
  const [deleteReferralCodeLoading, setDeleteReferralCodeLoading] = useState<string | null>(null);
  const [newReferralCode, setNewReferralCode] = useState('');
  const [newReferralDescription, setNewReferralDescription] = useState('');

  // --- Usage Statistics State (Admin) --- NEW
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [allTimeStats, setAllTimeStats] = useState<AllTimeStat[]>([]);
  const [statsView, setStatsView] = useState<'monthly' | 'alltime'>('monthly');
  const [loadingStats, setLoadingStats] = useState(true);
  const [fetchStatsError, setFetchStatsError] = useState('');

  // --- User Profile Update State (Self) ---
  const [profileUsername, setProfileUsername] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);
  const [profileUpdateError, setProfileUpdateError] = useState('');
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState('');

  // --- Change Password State (Self) ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('');


  // --- Initialize Profile Form ---
  useEffect(() => {
      if (currentUser) {
          setProfileUsername(currentUser.username);
          setProfileEmail(currentUser.email);
      }
  }, [currentUser]);


  // --- Fetch API Keys ---
  const fetchApiKeys = async () => {
    setLoadingApiKeys(true); setFetchApiKeysError('');
    try {
      const response = await apiClient.get('/apikeys');
      if (response.data?.success) setApiKeys(response.data.data.sort((a: ApiKey, b: ApiKey) => a.priority - b.priority));
      else setFetchApiKeysError('Failed to fetch API keys.');
    } catch (err: any) { setFetchApiKeysError(err.response?.data?.error || 'Error fetching API keys.'); if (err.response?.status === 401) setFetchApiKeysError('Unauthorized.');
    } finally { setLoadingApiKeys(false); }
  };

  // --- Fetch Users (Admin) ---
  const fetchUsers = async () => {
      if (currentUser?.role !== 'admin') return; // Guard clause
      setLoadingUsers(true); setFetchUsersError('');
      try {
          const response = await apiClient.get('/users');
          if (response.data?.success) setUsers(response.data.data);
          else setFetchUsersError('Failed to load users.');
      } catch (err: any) { setFetchUsersError(err.response?.data?.error || 'Error loading users.'); if (err.response?.status === 401) setFetchUsersError('Unauthorized.'); if (err.response?.status === 403) setFetchUsersError('Forbidden.');
      } finally { setLoadingUsers(false); }
  };

  // --- Fetch Referral Codes (Admin) ---
  const fetchReferralCodes = async () => {
      if (currentUser?.role !== 'admin') return; // Guard clause
      setLoadingReferralCodes(true); setFetchReferralCodesError('');
      try {
          const response = await apiClient.get('/referralcodes');
          if (response.data?.success) setReferralCodes(response.data.data);
          else setFetchReferralCodesError('Failed to load referral codes.');
      } catch (err: any) { setFetchReferralCodesError(err.response?.data?.error || 'Error loading referral codes.'); if (err.response?.status === 401) setFetchReferralCodesError('Unauthorized.'); if (err.response?.status === 403) setFetchReferralCodesError('Forbidden.');
      } finally { setLoadingReferralCodes(false); }
  };

    // --- Fetch Model Statuses (Admin) ---
    const fetchModelStatuses = async () => {
        if (currentUser?.role !== 'admin') return;
        setLoadingModelStatuses(true); setFetchModelStatusError('');
        try {
            // Fetch ALL models and the list of DISABLED models concurrently
            const [allModelsResponse, disabledModelsResponse] = await Promise.all([
                apiClient.get('/providers/all-models'), // Use the new endpoint
                apiClient.get('/disabledmodels')        // Fetch just the names of disabled models
            ]);
  
            if (allModelsResponse.data?.success && disabledModelsResponse.data?.success) {
                const allModelsData: { [provider: string]: string[] } = allModelsResponse.data.data;
                // Correctly type the response data as an array of strings
                const disabledModelNamesArray: string[] = disabledModelsResponse.data.data;
                // Create the Set directly from the array of strings
                const disabledModelNames = new Set(disabledModelNamesArray);

                const statuses: ModelStatus[] = [];
                // Iterate through all available models from the backend constant
                for (const provider in allModelsData) {
                    allModelsData[provider].forEach(modelName => {
                        statuses.push({
                            modelName: modelName,
                            isDisabled: disabledModelNames.has(modelName) // Check if this model is in the disabled list
                        });
                    });
                }
  
                // Sort models alphabetically for consistent display
                setModelStatuses(statuses.sort((a, b) => a.modelName.localeCompare(b.modelName)));
            } else {
                setFetchModelStatusError('Failed to load model statuses or disabled models.');
            }
        } catch (err: any) {
            setFetchModelStatusError(err.response?.data?.error || 'Error loading model statuses.');
            if (err.response?.status === 401) setFetchModelStatusError('Unauthorized.');
            if (err.response?.status === 403) setFetchModelStatusError('Forbidden.');
        } finally {
            setLoadingModelStatuses(false);
        }
    };
  
  
  
  // Initial data fetching
  useEffect(() => {
    fetchApiKeys(); // All users need API keys
    if (currentUser?.role === 'admin') {
        fetchUsers();
        fetchReferralCodes();
        fetchModelStatuses(); // Fetch model statuses for admin
        // Initial fetch for stats is handled by the stats useEffect below
    } else {
        // Ensure loading states are false if not admin
        setLoadingUsers(false);
        setLoadingReferralCodes(false);
        setLoadingModelStatuses(false); // Also set model status loading to false
        setLoadingStats(false); // Also set stats loading to false if not admin
    }
  }, [currentUser]); // Refetch if currentUser changes (e.g., after login)


  // --- Fetch Usage Statistics (Admin) --- NEW
  useEffect(() => {
      const fetchStats = async () => {
          if (currentUser?.role !== 'admin') {
              setLoadingStats(false); // Ensure loading is false if somehow triggered when not admin
              return;
          }
          setLoadingStats(true);
          setFetchStatsError('');
          try {
              let response;
              if (statsView === 'monthly') {
                  // Use the updated user-specific path
                  response = await apiClient.get<ApiResponse<MonthlyStat[]>>('/stats/usage/user/monthly');
                  if (response.data?.success) {
                      setMonthlyStats(response.data.data);
                  } else {
                      setFetchStatsError(response.data?.error || 'Failed to load monthly usage statistics.');
                  }
              } else { // statsView === 'alltime'
                  // Use the updated user-specific path
                  response = await apiClient.get<ApiResponse<AllTimeStat[]>>('/stats/usage/user/alltime');
                  if (response.data?.success) {
                      setAllTimeStats(response.data.data);
                  } else {
                      setFetchStatsError(response.data?.error || 'Failed to load all-time usage statistics.');
                  }
              }
          } catch (err: any) {
              setFetchStatsError(err.response?.data?.error || `Error loading ${statsView} usage statistics.`);
              if (err.response?.status === 401) setFetchStatsError('Unauthorized.');
              if (err.response?.status === 403) setFetchStatsError('Forbidden.');
          } finally {
              setLoadingStats(false);
          }
      };

      fetchStats();
  }, [currentUser, statsView]); // Refetch when user changes or view changes


  // --- API Key Handlers ---
  const handleAddKey = async (e: React.FormEvent) => {
       e.preventDefault(); setAddApiKeyLoading(true); setAddApiKeyError('');
       if (!newProviderName || !newKeyValue) { setAddApiKeyError('Provider Name and Key Value are required.'); setAddApiKeyLoading(false); return; }
       try {
           const response = await apiClient.post('/apikeys', { providerName: newProviderName, keyValue: newKeyValue });
           if (response.data?.success) { setNewProviderName(''); setNewKeyValue(''); fetchApiKeys(); }
           else { setAddApiKeyError(response.data?.error || 'Failed to add API key.'); }
       } catch (err: any) { setAddApiKeyError(err.response?.data?.error || 'Error adding API key.');
       } finally { setAddApiKeyLoading(false); }
  };
  const handleToggleApiKey = async (key: ApiKey) => {
       setApiKeyActionLoading(key._id); setApiKeyActionError('');
       const newIsEnabled = !key.isEnabled;
       try {
           const response = await apiClient.put(`/apikeys/${key._id}`, { isEnabled: newIsEnabled });
           if (response.data?.success) fetchApiKeys();
           else setApiKeyActionError(response.data?.error || 'Failed to toggle API key.');
       } catch (err: any) { setApiKeyActionError(err.response?.data?.error || 'Error toggling API key.');
       } finally { setApiKeyActionLoading(null); }
   };
   const handleDeleteApiKey = async (keyId: string, providerName: string) => {
        if (!window.confirm(`Delete API key for "${providerName}"?`)) return;
        setApiKeyActionLoading(keyId); setApiKeyActionError('');
        try {
            const response = await apiClient.delete(`/apikeys/${keyId}`);
            if (response.data?.success) fetchApiKeys();
            else setApiKeyActionError(response.data?.error || 'Failed to delete API key.');
        } catch (err: any) { setApiKeyActionError(err.response?.data?.error || 'Error deleting API key.');
        } finally { setApiKeyActionLoading(null); }
    };
    const handleEditPriority = (key: ApiKey) => {
        setEditingApiKeyId(key._id);
        setEditPriorityValue(key.priority);
        setApiKeyActionError('');
    };
    const handleCancelEditPriority = () => {
        setEditingApiKeyId(null);
    };
    const handleSavePriority = async (keyId: string) => {
        setApiKeyActionLoading(keyId); setApiKeyActionError('');
        try {
            const response = await apiClient.put(`/apikeys/${keyId}`, { priority: editPriorityValue });
           if (response.data?.success) {
               setEditingApiKeyId(null);
               fetchApiKeys(); // Refresh list
           } else { setApiKeyActionError(response.data?.error || 'Failed to update priority.'); }
        } catch (err: any) { setApiKeyActionError(err.response?.data?.error || 'Error updating priority.');
        } finally { setApiKeyActionLoading(null); }
    };

  // --- User Handlers (Admin) ---
   const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault(); setUserActionLoading('create'); setUserActionError('');
       if (!newUsername || !newUserEmail || !newUserPassword) { setUserActionError('Username, Email, and Password required.'); setUserActionLoading(null); return; }
       try {
           // Consider adding role selection to the form if needed
           const response = await apiClient.post('/users', { username: newUsername, email: newUserEmail, password: newUserPassword /*, role: 'user' */ });
           if (response.data?.success) { setNewUsername(''); setNewUserEmail(''); setNewUserPassword(''); fetchUsers(); }
           else { setUserActionError(response.data?.error || 'Failed to create user.'); }
       } catch (err: any) { setUserActionError(err.response?.data?.error || 'Error creating user.');
       } finally { setUserActionLoading(null); }
    };
   const handleDeleteUser = async (userId: string, username: string) => {
        if (!window.confirm(`Delete user "${username}"? This action cannot be undone.`)) return;
       setUserActionLoading(userId); setUserActionError('');
       try {
           const response = await apiClient.delete(`/users/${userId}`);
           if (response.data?.success) fetchUsers();
           else setUserActionError(response.data?.error || 'Failed to delete user.');
       } catch (err: any) { setUserActionError(err.response?.data?.error || 'Error deleting user.');
       } finally { setUserActionLoading(null); }
    };
    const handleEditUser = (user: User) => {
         setEditingUserId(user._id); setEditUsername(user.username); setEditEmail(user.email); setEditRole(user.role); setUserActionError('');
    };
    const handleCancelEdit = () => { setEditingUserId(null); };
    const handleUpdateUser = async (e: React.FormEvent, userId: string) => {
         e.preventDefault(); setUserActionLoading(userId); setUserActionError('');
        if (!editUsername || !editEmail) { setUserActionError('Username and Email required.'); setUserActionLoading(null); return; }
        try {
            const response = await apiClient.put(`/users/${userId}`, { username: editUsername, email: editEmail, role: editRole });
            if (response.data?.success) { handleCancelEdit(); fetchUsers(); }
            else { setUserActionError(response.data?.error || 'Failed to update user.'); }
        } catch (err: any) { setUserActionError(err.response?.data?.error || 'Error updating user.');
        } finally { setUserActionLoading(null); }
    };
    // --- Admin Reset Password Handler ---
    const handleAdminResetPassword = async (userId: string, username: string) => {
        const newPassword = prompt(`Enter new password for user "${username}":`);
        if (!newPassword) {
            // alert('Password reset cancelled.'); // Optional feedback
            return;
        }
         if (newPassword.length < 6) {
            alert('New password must be at least 6 characters long.');
            return;
        }

        setAdminResetPwdLoading(userId);
        setAdminResetPwdError(''); // Clear previous errors specific to admin reset

        try {
            const response = await apiClient.put(`/users/${userId}/resetpassword`, { newPassword });
            if (response.data?.success) {
                alert(`Password for ${username} reset successfully.`);
            } else {
                 setAdminResetPwdError(response.data?.error || `Failed to reset password for ${username}.`);
                 alert(`Error: ${response.data?.error || `Failed to reset password for ${username}.`}`); // Show error in alert too
            }
        } catch (err: any) {
             const errorMsg = err.response?.data?.error || `Error resetting password for ${username}.`;
             setAdminResetPwdError(errorMsg);
             alert(`Error: ${errorMsg}`);
        } finally {
            setAdminResetPwdLoading(null);
        }
    };

  // --- Model Visibility Handler (Admin) --- ADDED
  const handleToggleModelVisibility = async (modelName: string, currentlyDisabled: boolean) => {
      setModelActionLoading(modelName);
      setModelActionError('');
      try {
          let response;
          if (currentlyDisabled) {
              // Enable the model (DELETE request)
              response = await apiClient.delete(`/disabledmodels/${encodeURIComponent(modelName)}`);
          } else {
              // Disable the model (POST request)
              response = await apiClient.post('/disabledmodels', { modelName });
          }

          if (response.data?.success) {
              fetchModelStatuses(); // Refresh the list after successful toggle
          } else {
              setModelActionError(response.data?.error || `Failed to ${currentlyDisabled ? 'enable' : 'disable'} model.`);
          }
      } catch (err: any) {
          setModelActionError(err.response?.data?.error || `Error ${currentlyDisabled ? 'enabling' : 'disabling'} model.`);
      } finally {
          setModelActionLoading(null);
      }
  };


   // --- Referral Code Handlers (Admin) ---
    const handleAddReferralCode = async (e: React.FormEvent) => {
        e.preventDefault(); setAddReferralCodeLoading(true); setAddReferralCodeError('');
       if (!newReferralCode) { setAddReferralCodeError('Code value is required.'); setAddReferralCodeLoading(false); return; }
       try {
           const response = await apiClient.post('/referralcodes', { code: newReferralCode, description: newReferralDescription });
           if (response.data?.success) { setNewReferralCode(''); setNewReferralDescription(''); fetchReferralCodes(); }
           else { setAddReferralCodeError(response.data?.error || 'Failed to add code.'); }
       } catch (err: any) { setAddReferralCodeError(err.response?.data?.error || 'Error adding code.');
       } finally { setAddReferralCodeLoading(false); }
    };
    const handleDeleteReferralCode = async (codeId: string, codeValue: string) => {
        if (!window.confirm(`Delete referral code "${codeValue}"?`)) return;
       setDeleteReferralCodeLoading(codeId); setAddReferralCodeError('');
       try {
           const response = await apiClient.delete(`/referralcodes/${codeId}`);
           if (response.data?.success) fetchReferralCodes();
           else setAddReferralCodeError(response.data?.error || 'Failed to delete code.');
       } catch (err: any) { setAddReferralCodeError(err.response?.data?.error || 'Error deleting code.');
       } finally { setDeleteReferralCodeLoading(null); }
    };

  // --- User Profile Update Handlers (Self) ---
  const handleUpdateProfileDetails = async (e: React.FormEvent) => {
      e.preventDefault();
      setProfileUpdateLoading(true);
      setProfileUpdateError('');
      setProfileUpdateSuccess('');

      if (!profileUsername.trim() && !profileEmail.trim()) {
          setProfileUpdateError('Please provide a username or email to update.');
          setProfileUpdateLoading(false);
          return;
      }
      if (profileEmail && !/\S+@\S+\.\S+/.test(profileEmail)) {
           setProfileUpdateError('Please enter a valid email address.');
           setProfileUpdateLoading(false);
           return;
      }

      // Only allow email updates
      const updates: { email?: string } = {};
      // Only include email if it has actually changed
      if (profileEmail !== currentUser?.email) updates.email = profileEmail;

      if (Object.keys(updates).length === 0) {
           setProfileUpdateSuccess('No changes detected.');
           setProfileUpdateLoading(false);
           // Clear success message after a delay
           setTimeout(() => setProfileUpdateSuccess(''), 3000);
           return;
      }

      try {
          const response = await apiClient.put('/auth/updatedetails', updates);
          if (response.data?.success) {
              setProfileUpdateSuccess('Profile updated successfully!');
              // TODO: Consider refreshing currentUser data passed from App.tsx
              // refreshCurrentUser?.(); // Call if prop exists
              // Clear success message after a delay
               setTimeout(() => setProfileUpdateSuccess(''), 3000);
          } else {
              setProfileUpdateError(response.data?.error || 'Failed to update profile.');
          }
      } catch (err: any) {
          setProfileUpdateError(err.response?.data?.error || 'Error updating profile.');
      } finally {
          setProfileUpdateLoading(false);
      }
  };

  const handleUpdateProfilePassword = async (e: React.FormEvent) => {
       e.preventDefault();
       setPasswordChangeLoading(true);
       setPasswordChangeError('');
       setPasswordChangeSuccess('');

       if (!currentPassword || !newPassword || !confirmNewPassword) {
           setPasswordChangeError('Please fill in all password fields.');
           setPasswordChangeLoading(false);
           return;
       }
       if (newPassword !== confirmNewPassword) {
           setPasswordChangeError('New passwords do not match.');
           setPasswordChangeLoading(false);
           return;
       }
        if (newPassword.length < 6) {
           setPasswordChangeError('New password must be at least 6 characters long.');
           setPasswordChangeLoading(false);
           return;
       }

       try {
           const response = await apiClient.put('/auth/updatepassword', { currentPassword, newPassword });
           if (response.data?.success) {
               setPasswordChangeSuccess('Password changed successfully!');
               setCurrentPassword('');
               setNewPassword('');
               setConfirmNewPassword('');
               // Clear success message after a delay
               setTimeout(() => setPasswordChangeSuccess(''), 3000);
               // Note: New token is issued, might need handling if session management relies on it actively
           } else {
               setPasswordChangeError(response.data?.error || 'Failed to change password.');
           }
       } catch (err: any) {
           setPasswordChangeError(err.response?.data?.error || 'Error changing password.');
       } finally {
           setPasswordChangeLoading(false);
       }
  };

  // --- Render Component ---
  // Define Styles *inside* the component to access isDarkMode
  const pageStyle = {
    padding: '20px',
    maxWidth: '800px',
    margin: 'auto',
    color: isDarkMode ? '#e0e0e0' : 'inherit' // Base text color
  };

  const sectionStyle = {
    marginBottom: '30px',
    padding: '20px',
    border: `1px solid ${isDarkMode ? '#444' : '#ccc'}`,
    borderRadius: '8px',
    background: isDarkMode ? '#2a2a2a' : '#f9f9f9',
    color: isDarkMode ? '#e0e0e0' : 'inherit'
  };

  const h3Style = {
    marginTop: 0,
    marginBottom: '20px',
    borderBottom: `1px solid ${isDarkMode ? '#444' : '#eee'}`,
    paddingBottom: '10px',
    color: isDarkMode ? '#e0e0e0' : 'inherit'
  };

  const h4Style = {
    marginTop: 0,
    marginBottom: '15px',
    color: isDarkMode ? '#e0e0e0' : 'inherit'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '5px',
    fontWeight: '500' as const,
    color: isDarkMode ? '#ccc' : 'inherit'
  };

  const inputStyle = {
    padding: '10px',
    width: '100%',
    maxWidth: '400px',
    borderRadius: '4px',
    border: `1px solid ${isDarkMode ? '#555' : '#ccc'}`,
    background: isDarkMode ? '#3a3d41' : 'white',
    color: isDarkMode ? '#e0e0e0' : 'inherit',
    boxSizing: 'border-box' as const
  };

  const smallInputStyle = { // Style for smaller inputs like priority
      ...inputStyle,
      padding: '4px',
      width: '50px',
      maxWidth: 'none',
      marginLeft: '5px',
      marginRight: '5px'
  };

  const editFormInputStyle = { // Style for inputs within the edit user form
      ...inputStyle,
      padding: '8px',
      flexGrow: 1,
      minWidth: '120px',
      maxWidth: 'none' // Allow flex grow
  };

  const editFormSelectStyle = { // Style for select within the edit user form
      ...inputStyle,
      padding: '8px',
      width: 'auto', // Adjust width as needed
      maxWidth: 'none'
  };

  const buttonStyle = {
    padding: '10px 20px',
    cursor: 'pointer',
    background: isDarkMode ? '#0d6efd' : '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px'
  };

  const disabledButtonStyle = {
      ...buttonStyle,
      background: isDarkMode ? '#495057' : '#6c757d',
      cursor: 'not-allowed'
  };

  const smallButtonStyle = {
      padding: '6px 10px',
      fontSize: '0.9em',
      cursor: 'pointer',
      background: isDarkMode ? '#3a3d41' : '#f8f9fa',
      border: `1px solid ${isDarkMode ? '#555' : '#dee2e6'}`,
      color: isDarkMode ? '#e0e0e0' : 'inherit',
      borderRadius: '4px'
  };

  const smallSaveButtonStyle = { // Specific style for small save/cancel buttons
      ...smallButtonStyle,
      marginRight: '5px',
      padding: '4px 8px',
      fontSize: '0.9em'
  };

  const smallEditButtonStyle = { // Specific style for small edit priority button
      ...smallButtonStyle,
      marginLeft: '10px',
      fontSize: '0.8em',
      padding: '2px 5px'
  };

  const deleteButtonStyle = {
      ...smallButtonStyle,
      color: 'white',
      background: isDarkMode ? '#c82333' : '#dc3545', // Slightly darker red for dark mode
      border: 'none'
  };

  // --- Table Styles --- NEW
  const tableStyle: React.CSSProperties = {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '20px',
      fontSize: '0.9em',
      color: isDarkMode ? '#e0e0e0' : 'inherit'
  };

  const thStyle: React.CSSProperties = {
      borderBottom: `2px solid ${isDarkMode ? '#666' : '#ddd'}`,
      padding: '10px 8px',
      textAlign: 'left',
      background: isDarkMode ? '#3a3d41' : '#f2f2f2',
      color: isDarkMode ? '#e0e0e0' : 'inherit'
  };

  const tdStyle: React.CSSProperties = {
      borderBottom: `1px solid ${isDarkMode ? '#444' : '#eee'}`,
      padding: '8px',
      textAlign: 'left',
      color: isDarkMode ? '#e0e0e0' : 'inherit'
  };

  const activeTabButtonStyle = {
      ...smallButtonStyle,
      background: isDarkMode ? '#0d6efd' : '#007bff',
      color: 'white',
      border: `1px solid ${isDarkMode ? '#0d6efd' : '#007bff'}`,
      marginRight: '5px'
  };

  const inactiveTabButtonStyle = {
      ...smallButtonStyle,
      background: isDarkMode ? '#495057' : '#e9ecef',
      color: isDarkMode ? '#ccc' : '#495057',
      border: `1px solid ${isDarkMode ? '#555' : '#dee2e6'}`,
      marginRight: '5px'
  };

  const resetPwdButtonStyle = {
      ...smallButtonStyle,
      background: isDarkMode ? '#e0a800' : '#ffc107', // Darker yellow
      color: '#1a1a1a', // Ensure text is readable
      border: 'none'
  };

  // Style for model toggle button
  const modelToggleButtonEnableStyle = {
      ...smallButtonStyle,
      background: isDarkMode ? '#198754' : '#28a745', // Green
      color: 'white',
      border: 'none'
  };
  const modelToggleButtonDisableStyle = {
      ...smallButtonStyle,
      background: isDarkMode ? '#dc3545' : '#ffc107', // Red / Yellow
      color: isDarkMode ? 'white' : '#333',
      border: 'none'
  };


  return (
    <div style={pageStyle}> {/* Use pageStyle */}
      <h2 style={{ textAlign: 'center', marginBottom: '30px', color: isDarkMode ? '#e0e0e0' : 'inherit' }}>{t('settings_title')}</h2>

       {/* User Profile Section */}
       {currentUser && (
           <section style={sectionStyle}> {/* Use sectionStyle */}
               <h3 style={h3Style}>My Profile</h3> {/* Use h3Style */}
               {/* Update Details Form */}
               <form onSubmit={handleUpdateProfileDetails} style={{ marginBottom: '25px', paddingBottom: '25px', borderBottom: `1px solid ${isDarkMode ? '#444' : '#eee'}` }}>
                   <h4 style={h4Style}>Update Details</h4>
                   <div style={{ marginBottom: '15px' }}>
                       <label htmlFor="profileUsername" style={labelStyle}>Username:</label>
                       <input
                           type="text"
                           id="profileUsername"
                           value={profileUsername}
                           // onChange={(e) => setProfileUsername(e.target.value)} // Remove onChange
                           readOnly // Make input read-only
                           style={{...inputStyle, background: isDarkMode ? '#444' : '#eee', cursor: 'not-allowed'}} // Add styling for read-only
                       />
                   </div>
                   <div style={{ marginBottom: '20px' }}>
                       <label htmlFor="profileEmail" style={labelStyle}>Email:</label>
                       <input
                           type="email"
                           id="profileEmail"
                           value={profileEmail}
                           onChange={(e) => setProfileEmail(e.target.value)}
                           required
                           style={inputStyle}
                       />
                   </div>
                   <button type="submit" disabled={profileUpdateLoading} style={profileUpdateLoading ? disabledButtonStyle : buttonStyle}>
                       {profileUpdateLoading ? 'Saving...' : 'Save Details'}
                   </button>
                   {profileUpdateError && <p style={{ color: 'red', marginTop: '10px', fontSize: '0.9em' }}>{profileUpdateError}</p>}
                   {profileUpdateSuccess && <p style={{ color: 'green', marginTop: '10px', fontSize: '0.9em' }}>{profileUpdateSuccess}</p>}
               </form>

               {/* Change Password Form */}
               <form onSubmit={handleUpdateProfilePassword}>
                   <h4 style={h4Style}>Change Password</h4>
                    <div style={{ marginBottom: '15px' }}>
                       <label htmlFor="currentPassword" style={labelStyle}>Current Password:</label>
                       <input
                           type="password"
                           id="currentPassword"
                           value={currentPassword}
                           onChange={(e) => setCurrentPassword(e.target.value)}
                           required
                           autoComplete="current-password"
                           style={inputStyle}
                       />
                   </div>
                   <div style={{ marginBottom: '15px' }}>
                       <label htmlFor="newPassword" style={labelStyle}>New Password:</label>
                       <input
                           type="password"
                           id="newPassword"
                           value={newPassword}
                           onChange={(e) => setNewPassword(e.target.value)}
                           required
                           autoComplete="new-password"
                           style={inputStyle}
                       />
                   </div>
                   <div style={{ marginBottom: '20px' }}>
                       <label htmlFor="confirmNewPassword" style={labelStyle}>Confirm New Password:</label>
                       <input
                           type="password"
                           id="confirmNewPassword"
                           value={confirmNewPassword}
                           onChange={(e) => setConfirmNewPassword(e.target.value)}
                           required
                           autoComplete="new-password"
                           style={inputStyle}
                       />
                   </div>
                   <button type="submit" disabled={passwordChangeLoading} style={passwordChangeLoading ? disabledButtonStyle : buttonStyle}>
                       {passwordChangeLoading ? 'Changing...' : 'Change Password'}
                   </button>
                   {passwordChangeError && <p style={{ color: 'red', marginTop: '10px', fontSize: '0.9em' }}>{passwordChangeError}</p>}
                   {passwordChangeSuccess && <p style={{ color: 'green', marginTop: '10px', fontSize: '0.9em' }}>{passwordChangeSuccess}</p>}
               </form>
           </section>
       )}


      {/* API Key Management - Only show if user is admin */}
      {currentUser?.role === 'admin' && (
          <section style={sectionStyle}>
            <h3 style={h3Style}>{t('settings_api_keys_title')}</h3>
            <h4 style={h4Style}>Existing Keys (Sorted by Priority)</h4>
            {loadingApiKeys && <p>Loading...</p>}
            {fetchApiKeysError && <p style={{ color: 'red' }}>{fetchApiKeysError}</p>}
            {!loadingApiKeys && !fetchApiKeysError && ( apiKeys.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {apiKeys.map((key) => (
                    <li key={key._id} style={{ borderBottom: `1px solid ${isDarkMode ? '#444' : '#eee'}`, padding: '10px 0', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flexGrow: 1, minWidth: '250px' }}>
                        <strong style={{ color: isDarkMode ? '#e0e0e0' : 'inherit' }}>{key.providerName}</strong>
                        <span style={{ marginLeft: '10px', color: isDarkMode ? '#aaa' : '#666', fontSize: '0.9em' }}> Key: *****{key.keyValue.slice(-4)} </span>
                        <span style={{ marginLeft: '10px', color: key.isEnabled ? (isDarkMode ? '#77dd77' : 'green') : (isDarkMode ? '#ff6961' : 'red'), fontSize: '0.9em' }}> ({key.isEnabled ? 'Enabled' : 'Disabled'}) </span>
                        <span style={{ marginLeft: '15px', display: 'inline-block' }}>
                            Priority: {editingApiKeyId === key._id ? (
                                <>
                                    <input type="number" value={editPriorityValue} onChange={(e) => setEditPriorityValue(parseInt(e.target.value, 10) || 99)} min="1" style={smallInputStyle} />
                                    <button onClick={() => handleSavePriority(key._id)} disabled={apiKeyActionLoading === key._id} style={apiKeyActionLoading === key._id ? {...smallSaveButtonStyle, cursor: 'not-allowed', opacity: 0.6} : smallSaveButtonStyle}>Save</button>
                                    <button type="button" onClick={handleCancelEditPriority} style={smallSaveButtonStyle}>Cancel</button>
                                </>
                            ) : ( <> {key.priority} <button onClick={() => handleEditPriority(key)} style={smallEditButtonStyle}>Edit</button> </> )}
                        </span>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        <button style={apiKeyActionLoading === key._id || !!editingApiKeyId ? {...smallButtonStyle, cursor: 'not-allowed', opacity: 0.6} : smallButtonStyle} onClick={() => handleToggleApiKey(key)} disabled={apiKeyActionLoading === key._id || !!editingApiKeyId}> {apiKeyActionLoading === key._id ? '...' : (key.isEnabled ? 'Disable' : 'Enable')} </button>
                        <button style={apiKeyActionLoading === key._id || !!editingApiKeyId ? {...deleteButtonStyle, cursor: 'not-allowed', opacity: 0.6} : deleteButtonStyle} onClick={() => handleDeleteApiKey(key._id, key.providerName)} disabled={apiKeyActionLoading === key._id || !!editingApiKeyId}> {apiKeyActionLoading === key._id ? '...' : 'Delete'} </button>
                      </div>
                    </li>
                  ))}
                </ul> ) : <p>No API keys found.</p> )}
             <div style={{ marginTop: '20px', borderTop: `1px solid ${isDarkMode ? '#444' : '#eee'}`, paddingTop: '15px' }}>
                <h5 style={{ color: isDarkMode ? '#e0e0e0' : 'inherit' }}>Add New API Key</h5>
                <form onSubmit={handleAddKey} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input type="text" placeholder="Provider Name (e.g., Anthropic)" value={newProviderName} onChange={(e) => setNewProviderName(e.target.value)} required style={{...inputStyle, flexGrow: 1, minWidth: '150px', maxWidth: 'none'}} />
                    <input type="password" placeholder="API Key Value" value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} required style={{...inputStyle, flexGrow: 1, minWidth: '200px', maxWidth: 'none'}} />
                    <button type="submit" disabled={addApiKeyLoading} style={addApiKeyLoading ? disabledButtonStyle : buttonStyle}> {addApiKeyLoading ? 'Adding...' : 'Add Key'} </button>
                </form>
                 {addApiKeyError && <p style={{ color: 'red', marginTop: '10px' }}>{addApiKeyError}</p>}
             </div>
             {apiKeyActionError && <p style={{ color: 'red', marginTop: '10px' }}>{apiKeyActionError}</p>}
          </section>
      )}

      {/* User Management (Admin Only) */}
      {currentUser?.role === 'admin' && (
          <section style={sectionStyle}>
              <h3 style={h3Style}>{t('settings_users_title')}</h3>
              {adminResetPwdError && <p style={{ color: 'red', marginBottom: '10px' }}>Admin Action Error: {adminResetPwdError}</p>}
              {loadingUsers && <p>Loading users...</p>}
              {fetchUsersError && <p style={{ color: 'red' }}>{fetchUsersError}</p>}
              {!loadingUsers && !fetchUsersError && ( users.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                      {users.map((user) => (
                          <li key={user._id} style={{ borderBottom: `1px solid ${isDarkMode ? '#444' : '#eee'}`, padding: '10px 0', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                              {editingUserId === user._id ? (
                                  <form onSubmit={(e) => handleUpdateUser(e, user._id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', flexWrap: 'wrap' }}>
                                      <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} required style={editFormInputStyle} />
                                      <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required style={{...editFormInputStyle, minWidth: '150px'}} />
                                      {/* Allow role change for admins */}
                                      <select value={editRole} onChange={(e) => setEditRole(e.target.value as 'user' | 'admin')} style={editFormSelectStyle}>
                                          <option value="user">User</option>
                                          <option value="admin">Admin</option>
                                      </select>
                                      <button type="submit" disabled={userActionLoading === user._id} style={userActionLoading === user._id ? {...smallButtonStyle, cursor: 'not-allowed', opacity: 0.6} : smallButtonStyle}> {userActionLoading === user._id ? 'Saving...' : 'Save'} </button>
                                      <button type="button" onClick={handleCancelEdit} style={smallButtonStyle}>Cancel</button>
                                      {userActionError && editingUserId === user._id && <p style={{ color: 'red', width: '100%', margin: '5px 0 0 0' }}>{userActionError}</p>}
                                  </form>
                              ) : (
                                  <>
                                      <div style={{ flexGrow: 1, minWidth: '200px' }}>
                                          <strong style={{ color: isDarkMode ? '#e0e0e0' : 'inherit' }}>{user.username}</strong> ({user.email}) - Role: {user.role}
                                          <span style={{ marginLeft: '10px', color: isDarkMode ? '#aaa' : '#666', fontSize: '0.9em' }}> Joined: {new Date(user.createdAt).toLocaleDateString()} </span>
                                          {user._id === currentUser?._id && <span style={{ marginLeft: '10px', color: isDarkMode ? '#64b5f6' : 'blue', fontWeight: 'bold' }}>(You)</span>}
                                      </div>
                                      <div style={{ flexShrink: 0, display: 'flex', gap: '5px' }}>
                                          <button
                                              style={!!editingUserId || userActionLoading === user._id ? {...smallButtonStyle, cursor: 'not-allowed', opacity: 0.6} : smallButtonStyle}
                                              onClick={() => handleEditUser(user)}
                                              // Allow editing other admins, only disable if someone else is being edited or this user is loading
                                              disabled={!!editingUserId || userActionLoading === user._id}
                                          >
                                              Edit
                                          </button>
                                          {currentUser?.role === 'admin' && user.role !== 'admin' && (
                                              <button
                                                  style={!!editingUserId || adminResetPwdLoading === user._id ? {...resetPwdButtonStyle, cursor: 'not-allowed', opacity: 0.6} : resetPwdButtonStyle}
                                                  onClick={() => handleAdminResetPassword(user._id, user.username)}
                                                  disabled={!!editingUserId || adminResetPwdLoading === user._id}
                                              >
                                                  {adminResetPwdLoading === user._id ? 'Resetting...' : 'Reset Pwd'}
                                              </button>
                                          )}
                                          <button
                                              style={!!editingUserId || userActionLoading === user._id || user.role === 'admin' ? {...deleteButtonStyle, cursor: 'not-allowed', opacity: 0.6} : deleteButtonStyle}
                                              onClick={() => handleDeleteUser(user._id, user.username)}
                                              disabled={!!editingUserId || userActionLoading === user._id || user.role === 'admin'}
                                          >
                                              {userActionLoading === user._id ? 'Deleting...' : 'Delete'}
                                          </button>
                                      </div>
                                  </>
                              )}
                          </li>
                      ))}
                  </ul>
              ) : <p>No other users found.</p> )}
              <div style={{ marginTop: '20px', borderTop: `1px solid ${isDarkMode ? '#444' : '#eee'}`, paddingTop: '15px' }}>
                  <h5 style={{ color: isDarkMode ? '#e0e0e0' : 'inherit' }}>Create New User</h5>
                  <form onSubmit={handleCreateUser} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <input type="text" placeholder="Username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required style={{...inputStyle, flexGrow: 1, minWidth: '120px', maxWidth: 'none'}} />
                      <input type="email" placeholder="Email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required style={{...inputStyle, flexGrow: 1, minWidth: '150px', maxWidth: 'none'}} />
                      <input type="password" placeholder="Password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} required style={{...inputStyle, flexGrow: 1, minWidth: '120px', maxWidth: 'none'}} />
                      <button type="submit" disabled={userActionLoading === 'create'} style={userActionLoading === 'create' ? disabledButtonStyle : buttonStyle}>
                          {userActionLoading === 'create' ? 'Creating...' : 'Create User'}
                      </button>
                  </form>
                  {userActionError && !editingUserId && <p style={{ color: 'red', marginTop: '10px' }}>{userActionError}</p>}
              </div>
          </section>
      )}

      {/* Model Visibility Management (Admin Only) - ADDED Section */}
      {currentUser?.role === 'admin' && (
          <section style={sectionStyle}>
              <h3 style={h3Style}>{t('settings_model_visibility_title', 'Model Visibility')}</h3>
              {loadingModelStatuses && <p>Loading model statuses...</p>}
              {fetchModelStatusError && <p style={{ color: 'red' }}>{fetchModelStatusError}</p>}
              {modelActionError && <p style={{ color: 'red' }}>{modelActionError}</p>}
              {!loadingModelStatuses && !fetchModelStatusError && ( modelStatuses.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                      {modelStatuses.map((model) => (
                          <li key={model.modelName} style={{ borderBottom: `1px solid ${isDarkMode ? '#444' : '#eee'}`, padding: '10px 0', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                              <div style={{ flexGrow: 1, minWidth: '250px' }}>
                                  <code style={{ background: isDarkMode ? '#333' : '#e9ecef', color: isDarkMode ? '#f0f0f0' : 'inherit', padding: '0.2em 0.4em', borderRadius: '3px' }}>{model.modelName}</code>
                                  <span style={{ marginLeft: '10px', color: model.isDisabled ? (isDarkMode ? '#ff6961' : 'red') : (isDarkMode ? '#77dd77' : 'green'), fontSize: '0.9em' }}>
                                      ({model.isDisabled ? t('settings_model_disabled', 'Disabled') : t('settings_model_enabled', 'Enabled')})
                                  </span>
                              </div>
                              <div style={{ flexShrink: 0 }}>
                                  <button
                                      style={modelActionLoading === model.modelName ? (model.isDisabled ? {...modelToggleButtonEnableStyle, cursor: 'not-allowed', opacity: 0.6} : {...modelToggleButtonDisableStyle, cursor: 'not-allowed', opacity: 0.6}) : (model.isDisabled ? modelToggleButtonEnableStyle : modelToggleButtonDisableStyle)}
                                      onClick={() => handleToggleModelVisibility(model.modelName, model.isDisabled)}
                                      disabled={modelActionLoading === model.modelName}
                                  >
                                      {modelActionLoading === model.modelName ? '...' : (model.isDisabled ? t('settings_model_enable_button', 'Enable') : t('settings_model_disable_button', 'Disable'))}
                                  </button>
                              </div>
                          </li>
                      ))}
                  </ul>
              ) : <p>No models found or failed to load statuses.</p> )}
          </section>
      )}

       {/* Referral Code Management (Admin Only) */}
       {currentUser?.role === 'admin' && (
           <section style={sectionStyle}>
               <h3 style={h3Style}>{t('settings_referral_title')}</h3>
               {loadingReferralCodes && <p>Loading codes...</p>}
               {fetchReferralCodesError && <p style={{ color: 'red' }}>{fetchReferralCodesError}</p>}
               {!loadingReferralCodes && !fetchReferralCodesError && ( referralCodes.length > 0 ? (
                   <ul style={{ listStyle: 'none', padding: 0 }}>
                       {referralCodes.map((refCode) => (
                           <li key={refCode._id} style={{ borderBottom: `1px solid ${isDarkMode ? '#444' : '#eee'}`, padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                               <div>
                                   <code style={{ background: isDarkMode ? '#333' : '#e9ecef', color: isDarkMode ? '#f0f0f0' : 'inherit', padding: '0.2em 0.4em', borderRadius: '3px' }}>{refCode.code}</code>
                                   {refCode.description && <span style={{ marginLeft: '10px', color: isDarkMode ? '#aaa' : '#6c757d' }}>({refCode.description})</span>}
                                   <span style={{ marginLeft: '10px', color: isDarkMode ? '#aaa' : '#666', fontSize: '0.9em' }}> Created: {new Date(refCode.createdAt).toLocaleDateString()} </span>
                               </div>
                               <button style={deleteReferralCodeLoading === refCode._id ? {...deleteButtonStyle, cursor: 'not-allowed', opacity: 0.6} : deleteButtonStyle} onClick={() => handleDeleteReferralCode(refCode._id, refCode.code)} disabled={deleteReferralCodeLoading === refCode._id}>
                                   {deleteReferralCodeLoading === refCode._id ? '...' : 'Delete'}
                               </button>
                           </li>
                       ))}
                   </ul>
               ) : <p>No active referral codes.</p> )}
               <div style={{ marginTop: '20px', borderTop: `1px solid ${isDarkMode ? '#444' : '#eee'}`, paddingTop: '15px' }}>
                   <h5 style={{ color: isDarkMode ? '#e0e0e0' : 'inherit' }}>Add New Referral Code (Max: 5)</h5>
                   <form onSubmit={handleAddReferralCode} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                       <input type="text" placeholder="New Code" value={newReferralCode} onChange={(e) => setNewReferralCode(e.target.value)} required style={{...inputStyle, flexGrow: 1, minWidth: '150px', maxWidth: 'none'}} />
                       <input type="text" placeholder="Description (Optional)" value={newReferralDescription} onChange={(e) => setNewReferralDescription(e.target.value)} style={{...inputStyle, flexGrow: 1, minWidth: '200px', maxWidth: 'none'}} />
                       <button type="submit" disabled={addReferralCodeLoading || referralCodes.length >= 5} style={addReferralCodeLoading || referralCodes.length >= 5 ? disabledButtonStyle : buttonStyle}>
                           {addReferralCodeLoading ? 'Adding...' : 'Add Code'}
                       </button>
                   </form>
                   {referralCodes.length >= 5 && <p style={{ color: 'orange', fontSize: '0.9em', marginTop: '5px' }}>Maximum number of codes reached.</p>}
                   {addReferralCodeError && <p style={{ color: 'red', marginTop: '10px' }}>{addReferralCodeError}</p>}
               </div>
           </section>
       )}

       {/* Usage Statistics (Admin Only) */}
       {currentUser?.role === 'admin' && (
           <section style={sectionStyle}>
               <h3 style={h3Style}>Usage Statistics</h3>
               <div style={{ marginBottom: '15px' }}>
                   <button
                       style={statsView === 'monthly' ? activeTabButtonStyle : inactiveTabButtonStyle}
                       onClick={() => setStatsView('monthly')}
                       disabled={loadingStats}
                   >
                       Monthly
                   </button>
                   <button
                       style={statsView === 'alltime' ? activeTabButtonStyle : inactiveTabButtonStyle}
                       onClick={() => setStatsView('alltime')}
                       disabled={loadingStats}
                   >
                       All-Time
                   </button>
               </div>

               {loadingStats && <p>Loading statistics...</p>}
               {fetchStatsError && <p style={{ color: 'red' }}>{fetchStatsError}</p>}

               {!loadingStats && !fetchStatsError && (
                   <>
                       {statsView === 'monthly' && (
                           monthlyStats.length > 0 ? (
                               <table style={tableStyle}>
                                   <thead>
                                       <tr>
                                           <th style={thStyle}>Year</th>
                                           <th style={thStyle}>Month</th>
                                           <th style={thStyle}>User</th>
                                           {/* Removed Model column */}
                                           <th style={thStyle}>Count</th>
                                       </tr>
                                   </thead>
                                   <tbody>
                                       {monthlyStats.map((stat, index) => (
                                           <tr key={index}>
                                               <td style={tdStyle}>{stat.year}</td>
                                               <td style={tdStyle}>{getMonthName(stat.month)}</td>
                                               <td style={tdStyle}>{stat.user}</td>
                                               {/* Removed Model cell */}
                                               <td style={tdStyle}>{stat.count}</td>
                                           </tr>
                                       ))}
                                   </tbody>
                               </table>
                           ) : <p>No monthly usage data available.</p>
                       )}

                       {statsView === 'alltime' && (
                           allTimeStats.length > 0 ? (
                               <table style={tableStyle}>
                                   <thead>
                                       <tr>
                                           <th style={thStyle}>User</th>
                                           {/* Removed Model column */}
                                           <th style={thStyle}>Count</th>
                                       </tr>
                                   </thead>
                                   <tbody>
                                       {allTimeStats.map((stat, index) => (
                                           <tr key={index}>
                                               <td style={tdStyle}>{stat.user}</td>
                                               {/* Removed Model cell */}
                                               <td style={tdStyle}>{stat.count}</td>
                                           </tr>
                                       ))}
                                   </tbody>
                               </table>
                           ) : <p>No all-time usage data available.</p>
                       )}
                   </>
               )}
           </section>
       )}

    </div>
  );
};

export default SettingsPage;
