import React, { useState, useEffect } from 'react'; // Removed useMemo as it's not used
import { useTranslation } from 'react-i18next';
// Import updated and new interfaces from api.ts
import apiClient, {
    ApiResponse,
    MonthlyUserStat, // Renamed
    AllTimeUserStat,  // Renamed
    MonthlyModelStat, // New
    AllTimeModelStat  // New
} from '../services/api';
import useAuthStore from '../store/authStore'; // Import the store
import Switch from 'react-switch'; // Import a toggle switch component

// Interfaces (Keep existing local interfaces)
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

// Interface for Global Settings
interface GlobalSettings {
    _id?: string; // Optional, might not be needed on frontend always
    key?: string; // Optional
    globalStreamingEnabled: boolean;
    lastUpdatedAt?: string; // Optional
}

// --- NEW Interfaces for Custom Models ---
interface CustomProvider {
    _id: string;
    name: string;
    createdAt?: string; // Optional from backend
}

interface CustomModel {
    _id: string;
    name: string;
    provider: { // Populated from backend
        _id: string;
        name: string;
    };
    baseModelIdentifier: string;
    systemPrompt: string;
    createdAt?: string; // Optional from backend
}

// Interface for the base models dropdown structure
interface BaseModelsForDropdown {
    [provider: string]: string[];
}
// --- End NEW Interfaces ---


// Removed SettingsPageProps interface

// Helper to get month name
const getMonthName = (monthNumber: number, locale: string = 'en-US'): string => {
    const date = new Date();
    date.setMonth(monthNumber - 1); // Month is 0-indexed in JS Date
    return date.toLocaleString(locale, { month: 'long' });
};

// Define the list of supported providers
const SUPPORTED_API_PROVIDERS = ['Gemini', 'Deepseek', 'OpenAI', 'Perplexity', 'Anthropic'];


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
  const [newProviderName, setNewProviderName] = useState(''); // Keep this state for the selected value
  const [newKeyValue, setNewKeyValue] = useState('');
  const [editingApiKeyId, setEditingApiKeyId] = useState<string | null>(null);
  const [editPriorityValue, setEditPriorityValue] = useState<number>(99);

  // Calculate available providers for the dropdown (Case-Insensitive)
  const existingProviderNamesLower = new Set(apiKeys.map(key => key.providerName.toLowerCase()));
  const availableProviders = SUPPORTED_API_PROVIDERS.filter(
    provider => !existingProviderNamesLower.has(provider.toLowerCase())
  );

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

  // --- Usage Statistics State (Admin) --- UPDATED
  const [statsTypeView, setStatsTypeView] = useState<'user' | 'model'>('user'); // 'user' or 'model'
  const [statsTimeView, setStatsTimeView] = useState<'monthly' | 'alltime'>('monthly'); // 'monthly' or 'alltime'
  const [loadingStats, setLoadingStats] = useState(true);
  const [fetchStatsError, setFetchStatsError] = useState('');
  // State for User Stats
  const [monthlyUserStats, setMonthlyUserStats] = useState<MonthlyUserStat[]>([]);
  const [allTimeUserStats, setAllTimeUserStats] = useState<AllTimeUserStat[]>([]);
  // State for Model Stats
  const [monthlyModelStats, setMonthlyModelStats] = useState<MonthlyModelStat[]>([]);
  const [allTimeModelStats, setAllTimeModelStats] = useState<AllTimeModelStat[]>([]);

  // --- Usage Statistics Filtering State --- NEW
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // Empty string for "All Months"

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

  // --- Global Settings State (Admin) ---
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [loadingGlobalSettings, setLoadingGlobalSettings] = useState(true);
  const [fetchGlobalSettingsError, setFetchGlobalSettingsError] = useState('');
  const [updateGlobalSettingsLoading, setUpdateGlobalSettingsLoading] = useState(false);
  const [updateGlobalSettingsError, setUpdateGlobalSettingsError] = useState('');

  // --- Custom Provider/Model State (Admin) --- NEW ---
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);
  const [loadingCustomProviders, setLoadingCustomProviders] = useState(true);
  const [fetchCustomProvidersError, setFetchCustomProvidersError] = useState('');
  const [customProviderActionLoading, setCustomProviderActionLoading] = useState<string | null>(null); // For add/delete
  const [customProviderActionError, setCustomProviderActionError] = useState('');
  const [newCustomProviderName, setNewCustomProviderName] = useState('');

  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [loadingCustomModels, setLoadingCustomModels] = useState(false); // Only load when provider selected
  const [fetchCustomModelsError, setFetchCustomModelsError] = useState('');
  const [selectedCustomProviderId, setSelectedCustomProviderId] = useState<string>(''); // ID of provider whose models are shown

  const [baseModelsForDropdown, setBaseModelsForDropdown] = useState<BaseModelsForDropdown>({});
  const [loadingBaseModels, setLoadingBaseModels] = useState(true);
  const [fetchBaseModelsError, setFetchBaseModelsError] = useState('');

  const [showModelModal, setShowModelModal] = useState(false);
  const [editingCustomModel, setEditingCustomModel] = useState<CustomModel | null>(null); // null for Add, object for Edit
  const [modelFormName, setModelFormName] = useState('');
  const [modelFormBaseIdentifier, setModelFormBaseIdentifier] = useState('');
  const [modelFormSystemPrompt, setModelFormSystemPrompt] = useState('');
  const [modelFormLoading, setModelFormLoading] = useState(false);
  const [modelFormError, setModelFormError] = useState('');
  // --- End Custom Provider/Model State ---


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

  // --- Fetch Global Settings (Admin) ---
  const fetchGlobalSettings = async () => {
      if (currentUser?.role !== 'admin') {
          setLoadingGlobalSettings(false); // Not applicable for non-admins
          return;
      }
      setLoadingGlobalSettings(true); setFetchGlobalSettingsError('');
      try {
          const response = await apiClient.get('/settings'); // Use the new settings endpoint
          if (response.data?.success) {
              setGlobalSettings(response.data.data);
          } else {
              setFetchGlobalSettingsError('Failed to load global settings.');
          }
      } catch (err: any) {
          setFetchGlobalSettingsError(err.response?.data?.error || 'Error loading global settings.');
          if (err.response?.status === 401) setFetchGlobalSettingsError('Unauthorized.');
          if (err.response?.status === 403) setFetchGlobalSettingsError('Forbidden.');
      } finally {
          setLoadingGlobalSettings(false);
      }
  };

  // --- Fetch Custom Providers (Admin) --- NEW ---
  const fetchCustomProviders = async () => {
      if (currentUser?.role !== 'admin') return;
      setLoadingCustomProviders(true); setFetchCustomProvidersError('');
      try {
          const response = await apiClient.get('/customproviders');
          if (response.data?.success) {
              setCustomProviders(response.data.data);
          } else {
              setFetchCustomProvidersError('Failed to load custom providers.');
          }
      } catch (err: any) {
          setFetchCustomProvidersError(err.response?.data?.error || 'Error loading custom providers.');
          if (err.response?.status === 401) setFetchCustomProvidersError('Unauthorized.');
          if (err.response?.status === 403) setFetchCustomProvidersError('Forbidden.');
      } finally {
          setLoadingCustomProviders(false);
      }
  };

  // --- Fetch Custom Models for a Provider (Admin) --- NEW ---
  const fetchCustomModels = async (providerId: string) => {
      if (currentUser?.role !== 'admin' || !providerId) {
          setCustomModels([]); // Clear models if no provider selected
          return;
      }
      setLoadingCustomModels(true); setFetchCustomModelsError('');
      try {
          // Use the nested route structure if needed, or a query param
          const response = await apiClient.get(`/custommodels?providerId=${providerId}`); // Using query param based on backend controller
          if (response.data?.success) {
              setCustomModels(response.data.data);
          } else {
              setFetchCustomModelsError(`Failed to load models for provider.`);
          }
      } catch (err: any) {
          setFetchCustomModelsError(err.response?.data?.error || `Error loading models.`);
          if (err.response?.status === 401) setFetchCustomModelsError('Unauthorized.');
          if (err.response?.status === 403) setFetchCustomModelsError('Forbidden.');
      } finally {
          setLoadingCustomModels(false);
      }
  };

  // --- Fetch Base Models for Dropdown (Admin) --- NEW ---
   const fetchBaseModelsForDropdown = async () => {
        if (currentUser?.role !== 'admin') return;
        setLoadingBaseModels(true); setFetchBaseModelsError('');
        try {
            const response = await apiClient.get('/providers/all-models');
            if (response.data?.success) {
                setBaseModelsForDropdown(response.data.data);
            } else {
                setFetchBaseModelsError('Failed to load base models list.');
            }
        } catch (err: any) {
            setFetchBaseModelsError(err.response?.data?.error || 'Error loading base models.');
             if (err.response?.status === 401) setFetchBaseModelsError('Unauthorized.');
             if (err.response?.status === 403) setFetchBaseModelsError('Forbidden.');
        } finally {
            setLoadingBaseModels(false);
        }
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
                // Updated to handle the new model structure with name and supportsVision properties
                const allModelsData: { [provider: string]: Array<{name: string, supportsVision: boolean}> } = allModelsResponse.data.data;
                // Correctly type the response data as an array of strings
                const disabledModelNamesArray: string[] = disabledModelsResponse.data.data;
                // Create the Set directly from the array of strings
                const disabledModelNames = new Set(disabledModelNamesArray);

                const statuses: ModelStatus[] = [];
                // Iterate through all available models from the backend constant
                for (const provider in allModelsData) {
                    allModelsData[provider].forEach(model => {
                        // Extract the name property from each model object
                        statuses.push({
                            modelName: model.name,
                            isDisabled: disabledModelNames.has(model.name) // Check if this model is in the disabled list
                        });
                    });
                }

                // Sort models alphabetically for consistent display
                setModelStatuses(statuses.sort((a, b) => a.modelName.localeCompare(b.modelName)));
            } else {
                setFetchModelStatusError('Failed to load model statuses or disabled models.');
            }
        } catch (err: any) {
            console.error("Error fetching model statuses:", err);
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
         fetchGlobalSettings(); // Fetch global settings for admin
         fetchCustomProviders(); // Fetch custom providers for admin
         fetchBaseModelsForDropdown(); // Fetch base models for admin dropdown
         // Initial fetch for stats is handled by the stats useEffect below
     } else {
        // Ensure loading states are false if not admin
        setLoadingUsers(false);
        setLoadingCustomProviders(false); // NEW
        setLoadingBaseModels(false); // NEW
        setLoadingReferralCodes(false);
         setLoadingModelStatuses(false); // Also set model status loading to false
         setLoadingStats(false); // Also set stats loading to false if not admin
         setLoadingGlobalSettings(false); // Also set global settings loading to false if not admin
     }
  }, [currentUser]); // Refetch if currentUser changes (e.g., after login)

  // --- Fetch Custom Models when selected provider changes --- NEW ---
  useEffect(() => {
      if (selectedCustomProviderId) {
          fetchCustomModels(selectedCustomProviderId);
      } else {
          setCustomModels([]); // Clear models if no provider is selected
      }
  }, [selectedCustomProviderId]); // Dependency on selected provider ID


  // --- Fetch Usage Statistics (Admin) --- UPDATED
  useEffect(() => {
      const fetchStats = async () => {
          if (currentUser?.role !== 'admin') {
              setLoadingStats(false); // Ensure loading is false if somehow triggered when not admin
              return;
          }
          setLoadingStats(true);
          setFetchStatsError('');
          let endpoint = '';
          let statType = ''; // For error messages
          const params: any = {}; // Object to hold query parameters

          // Determine endpoint based on view selections
          if (statsTypeView === 'user') {
              endpoint = statsTimeView === 'monthly' ? '/stats/usage/user/monthly' : '/stats/usage/user/alltime';
              statType = `user ${statsTimeView}`;
          } else { // statsTypeView === 'model'
              endpoint = statsTimeView === 'monthly' ? '/stats/usage/model/monthly' : '/stats/usage/model/alltime';
              statType = `model ${statsTimeView}`;
          }

          // Add year and month parameters for monthly view
          if (statsTimeView === 'monthly') {
              if (selectedYear) params.year = selectedYear;
              if (selectedMonth) params.month = selectedMonth;
          }

          try {
              const response = await apiClient.get(endpoint, { params }); // Fetch data with parameters

              if (response.data?.success) {
                  // Update the correct state based on the view
                  if (statsTypeView === 'user') {
                      if (statsTimeView === 'monthly') {
                          setMonthlyUserStats(response.data.data as MonthlyUserStat[]);
                      } else {
                          setAllTimeUserStats(response.data.data as AllTimeUserStat[]);
                      }
                  } else { // statsTypeView === 'model'
                      if (statsTimeView === 'monthly') {
                          setMonthlyModelStats(response.data.data as MonthlyModelStat[]);
                      } else {
                          setAllTimeModelStats(response.data.data as AllTimeModelStat[]);
                      }
                  }
              } else {
                  setFetchStatsError(response.data?.error || `Failed to load ${statType} usage statistics.`);
              }
          } catch (err: any) {
              setFetchStatsError(err.response?.data?.error || `Error loading ${statType} usage statistics.`);
              if (err.response?.status === 401) setFetchStatsError('Unauthorized.');
              if (err.response?.status === 403) setFetchStatsError('Forbidden.');
          } finally {
              setLoadingStats(false);
          }
      };

      fetchStats();
  // Refetch when user changes or any view selection changes, including year/month
  }, [currentUser, statsTypeView, statsTimeView, selectedYear, selectedMonth]);


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

  // --- Global Settings Handler (Admin) ---
  const handleToggleGlobalStreaming = async (checked: boolean) => {
      if (!globalSettings || currentUser?.role !== 'admin') return;

      setUpdateGlobalSettingsLoading(true);
      setUpdateGlobalSettingsError('');

      try {
          // Optimistically update UI state first
          setGlobalSettings(prev => prev ? { ...prev, globalStreamingEnabled: checked } : null);

          const response = await apiClient.put('/settings', { globalStreamingEnabled: checked });
          if (!response.data?.success) {
              // Revert UI on failure and show error
              setGlobalSettings(prev => prev ? { ...prev, globalStreamingEnabled: !checked } : null); // Revert
              setUpdateGlobalSettingsError(response.data?.error || 'Failed to update setting.');
              // Optionally refetch to be absolutely sure: fetchGlobalSettings();
          }
          // On success, the UI is already updated optimistically
      } catch (err: any) {
          // Revert UI on failure and show error
          setGlobalSettings(prev => prev ? { ...prev, globalStreamingEnabled: !checked } : null); // Revert
          setUpdateGlobalSettingsError(err.response?.data?.error || 'Error updating setting.');
          // Optionally refetch to be absolutely sure: fetchGlobalSettings();
      } finally {
          setUpdateGlobalSettingsLoading(false);
      }
  };


  // --- Model Visibility Handler (Admin) --- UPDATED
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
              // Add a small delay before refreshing to ensure backend has processed the change
              setTimeout(() => {
                  fetchModelStatuses(); // Refresh the list after successful toggle
              }, 500);
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

  // --- Custom Provider Handlers (Admin) --- NEW ---
  const handleAddCustomProvider = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCustomProviderName.trim()) {
          setCustomProviderActionError('Provider name cannot be empty.');
          return;
      }
      setCustomProviderActionLoading('add');
      setCustomProviderActionError('');
      try {
          const response = await apiClient.post('/customproviders', { name: newCustomProviderName });
          if (response.data?.success) {
              setNewCustomProviderName('');
              fetchCustomProviders(); // Refresh list
          } else {
              setCustomProviderActionError(response.data?.error || 'Failed to add provider.');
          }
      } catch (err: any) {
          setCustomProviderActionError(err.response?.data?.error || 'Error adding provider.');
      } finally {
          setCustomProviderActionLoading(null);
      }
  };

  const handleDeleteCustomProvider = async (providerId: string, providerName: string) => {
      if (!window.confirm(`Delete provider "${providerName}"? This will also delete ALL associated custom models.`)) return;
      setCustomProviderActionLoading(providerId);
      setCustomProviderActionError('');
      try {
          const response = await apiClient.delete(`/customproviders/${providerId}`);
          if (response.data?.success) {
              fetchCustomProviders(); // Refresh list
              if (selectedCustomProviderId === providerId) {
                  setSelectedCustomProviderId(''); // Clear selection if deleted provider was selected
                  setCustomModels([]); // Clear models list
              }
          } else {
              setCustomProviderActionError(response.data?.error || 'Failed to delete provider.');
          }
      } catch (err: any) {
          setCustomProviderActionError(err.response?.data?.error || 'Error deleting provider.');
      } finally {
          setCustomProviderActionLoading(null);
      }
  };

  // --- Custom Model Modal and Form Handlers (Admin) --- NEW ---
  const openAddModelModal = () => {
      if (!selectedCustomProviderId) {
          alert("Please select a Custom Provider first.");
          return;
      }
      setEditingCustomModel(null); // Ensure it's in 'Add' mode
      setModelFormName('');
      setModelFormBaseIdentifier('');
      setModelFormSystemPrompt('');
      setModelFormError('');
      setShowModelModal(true);
  };

  const openEditModelModal = (model: CustomModel) => {
      setEditingCustomModel(model);
      setModelFormName(model.name);
      setModelFormBaseIdentifier(model.baseModelIdentifier);
      setModelFormSystemPrompt(model.systemPrompt);
      setModelFormError('');
      setShowModelModal(true);
  };

  const closeModelModal = () => {
      setShowModelModal(false);
      setEditingCustomModel(null); // Clear editing state
  };

  const handleSaveCustomModel = async (e: React.FormEvent) => {
      e.preventDefault();
      setModelFormLoading(true);
      setModelFormError('');

      if (!modelFormName.trim() || !modelFormBaseIdentifier) {
          setModelFormError('Model Name and Linked Base Model are required.');
          setModelFormLoading(false);
          return;
      }

      const payload = {
          name: modelFormName,
          provider: selectedCustomProviderId, // Required for create, ignored by update but good practice
          baseModelIdentifier: modelFormBaseIdentifier,
          systemPrompt: modelFormSystemPrompt
      };

      try {
          let response;
          if (editingCustomModel) {
              // Update existing model
              response = await apiClient.put(`/custommodels/${editingCustomModel._id}`, payload);
          } else {
              // Create new model
              response = await apiClient.post('/custommodels', payload);
          }

          if (response.data?.success) {
              closeModelModal();
              fetchCustomModels(selectedCustomProviderId); // Refresh model list for the current provider
          } else {
              setModelFormError(response.data?.error || 'Failed to save custom model.');
          }
      } catch (err: any) {
          setModelFormError(err.response?.data?.error || 'Error saving custom model.');
      } finally {
          setModelFormLoading(false);
      }
  };

   const handleDeleteCustomModel = async (modelId: string, modelName: string) => {
        if (!window.confirm(`Delete custom model "${modelName}"?`)) return;
        // Use modelFormLoading and modelFormError for actions within the model list for simplicity
        setModelFormLoading(true); // Indicate loading state
        setModelFormError('');
        try {
            const response = await apiClient.delete(`/custommodels/${modelId}`);
            if (response.data?.success) {
                fetchCustomModels(selectedCustomProviderId); // Refresh list
            } else {
                 setModelFormError(response.data?.error || 'Failed to delete custom model.'); // Show error near the list
            }
        } catch (err: any) {
             setModelFormError(err.response?.data?.error || 'Error deleting custom model.');
        } finally {
             setModelFormLoading(false);
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
                {availableProviders.length > 0 ? (
                    <form onSubmit={handleAddKey} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <select
                            value={newProviderName}
                            onChange={(e) => setNewProviderName(e.target.value)}
                            required
                            style={{...inputStyle, flexGrow: 1, minWidth: '150px', maxWidth: 'none', height: 'auto', padding: '10px'}} // Reuse inputStyle, adjust height/padding
                        >
                            <option value="" disabled>-- Select Provider --</option>
                            {availableProviders.map(provider => (
                                <option key={provider} value={provider}>{provider}</option>
                            ))}
                        </select>
                        <input
                            type="password"
                            placeholder="API Key Value"
                            value={newKeyValue}
                            onChange={(e) => setNewKeyValue(e.target.value)}
                            required
                            style={{...inputStyle, flexGrow: 1, minWidth: '200px', maxWidth: 'none'}}
                        />
                        <button type="submit" disabled={addApiKeyLoading || !newProviderName} style={(addApiKeyLoading || !newProviderName) ? disabledButtonStyle : buttonStyle}>
                            {addApiKeyLoading ? 'Adding...' : 'Add Key'}
                        </button>
                    </form>
                ) : (
                    <p style={{ color: isDarkMode ? '#aaa' : '#666', fontStyle: 'italic' }}>All supported providers already have API keys configured.</p>
                )}
                 {addApiKeyError && <p style={{ color: 'red', marginTop: '10px' }}>{addApiKeyError}</p>}
             </div>
             {apiKeyActionError && <p style={{ color: 'red', marginTop: '10px' }}>{apiKeyActionError}</p>}
          </section>
      )}

      {/* User Management (Admin Only) */}
      {currentUser?.role === 'admin' && (
          <details style={sectionStyle}> {/* Removed 'open' */}
              <summary style={{...h3Style, cursor: 'pointer', display: 'list-item'}}>{t('settings_users_title')}</summary> {/* Changed h3 to summary */}
              {/* Content starts here */}
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
          </details>
      )}

      {/* Model Visibility Management (Admin Only) - ADDED Section */}
      {currentUser?.role === 'admin' && (
          <details style={sectionStyle}> {/* Removed 'open' */}
              <summary style={{...h3Style, cursor: 'pointer', display: 'list-item'}}>{t('settings_model_visibility_title', 'Model Visibility')}</summary> {/* Changed h3 to summary */}
              {/* Content starts here */}
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
          </details>
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
           <details style={sectionStyle}> {/* Changed section to details */}
               <summary style={{...h3Style, cursor: 'pointer', display: 'list-item'}}>Usage Statistics</summary> {/* Changed h3 to summary */}
               {/* Type Selection (User/Model) */}
               <div style={{ marginBottom: '10px', marginTop: '20px' }}> {/* Added marginTop to space content from summary */}
                   <button
                       style={statsTypeView === 'user' ? activeTabButtonStyle : inactiveTabButtonStyle}
                       onClick={() => setStatsTypeView('user')}
                       disabled={loadingStats}
                   >
                       User Stats
                   </button>
                   <button
                       style={statsTypeView === 'model' ? activeTabButtonStyle : inactiveTabButtonStyle}
                       onClick={() => setStatsTypeView('model')}
                       disabled={loadingStats}
                   >
                       Model Stats
                   </button>
               </div>
               {/* Time Selection (Monthly/All-Time) */}
               <div style={{ marginBottom: '15px' }}>
                   <button
                       style={statsTimeView === 'monthly' ? activeTabButtonStyle : inactiveTabButtonStyle}
                       onClick={() => setStatsTimeView('monthly')}
                       disabled={loadingStats}
                   >
                       Monthly
                   </button>
                   <button
                       style={statsTimeView === 'alltime' ? activeTabButtonStyle : inactiveTabButtonStyle}
                       onClick={() => setStatsTimeView('alltime')}
                       disabled={loadingStats}
                   >
                       All-Time
                   </button>
               </div>


               {loadingStats && <p>Loading statistics...</p>}
               {fetchStatsError && <p style={{ color: 'red' }}>{fetchStatsError}</p>}

               {!loadingStats && !fetchStatsError && (
                   <>
                       {/* User Stats View */}
                       {statsTypeView === 'user' && (
                           <>
                               {statsTimeView === 'monthly' && (
                                   <table style={tableStyle}> {/* Always render table for monthly view */}
                                       <thead>
                                           <tr>
                                               <th style={thStyle}>
                                                   Year:
                                                   <select
                                                       id="yearSelect"
                                                       value={selectedYear}
                                                       onChange={(e) => setSelectedYear(e.target.value)}
                                                       style={{...inputStyle, width: 'auto', minWidth: '80px', marginLeft: '5px', display: 'inline-block'}}
                                                       disabled={loadingStats}
                                                   >
                                                       {/* Generate years - e.g., current year and a few past years */}
                                                       {[...Array(5)].map((_, i) => {
                                                           const year = currentYear - i;
                                                           return <option key={year} value={year.toString()}>{year}</option>;
                                                       })}
                                                   </select>
                                               </th>
                                               <th style={thStyle}>
                                                   Month:
                                                    <select
                                                       id="monthSelect"
                                                       value={selectedMonth}
                                                       onChange={(e) => setSelectedMonth(e.target.value)}
                                                       style={{...inputStyle, width: 'auto', minWidth: '100px', marginLeft: '5px', display: 'inline-block'}}
                                                       disabled={loadingStats}
                                                   >
                                                       <option value="">All Months</option> {/* Option for all months */}
                                                       {[...Array(12)].map((_, i) => {
                                                           const monthNumber = i + 1;
                                                           return <option key={monthNumber} value={monthNumber.toString()}>{getMonthName(monthNumber)}</option>;
                                                       })}
                                                   </select>
                                               </th>
                                               <th style={thStyle}>User</th>
                                               <th style={thStyle}>Count</th>
                                           </tr>
                                       </thead>
                                       {/* Conditionally render tbody */}
                                       {monthlyUserStats.length > 0 ? (
                                           <tbody>
                                               {monthlyUserStats.map((stat, index) => (
                                                   <tr key={index}>
                                                       <td style={tdStyle}>{stat.year}</td>
                                                       <td style={tdStyle}>{getMonthName(stat.month)}</td>
                                                       <td style={tdStyle}>{stat.user}</td>
                                                       <td style={tdStyle}>{stat.count}</td>
                                                   </tr>
                                               ))}
                                           </tbody>
                                       ) : (
                                            <tbody>
                                                <tr>
                                                    <td colSpan={4} style={{...tdStyle, textAlign: 'center', fontStyle: 'italic'}}>No monthly user usage data available for the selected period.</td>
                                                </tr>
                                            </tbody>
                                       )}
                                   </table>
                               )}
                               {statsTimeView === 'alltime' && (
                                   allTimeUserStats.length > 0 ? (
                                       <table style={tableStyle}>
                                           <thead>
                                               <tr>
                                                   <th style={thStyle}>User</th>
                                                   <th style={thStyle}>Count</th>
                                               </tr>
                                           </thead>
                                           <tbody>
                                               {allTimeUserStats.map((stat, index) => (
                                                   <tr key={index}>
                                                       <td style={tdStyle}>{stat.user}</td>
                                                       <td style={tdStyle}>{stat.count}</td>
                                                   </tr>
                                               ))}
                                           </tbody>
                                       </table>
                                   ) : <p>No all-time user usage data available.</p>
                               )}
                           </>
                       )}

                       {/* Model Stats View */}
                       {statsTypeView === 'model' && (
                           <>
                               {statsTimeView === 'monthly' && (
                                    <table style={tableStyle}> {/* Always render table for monthly view */}
                                       <thead>
                                           <tr>
                                               <th style={thStyle}>
                                                    Year:
                                                    <select
                                                       id="yearSelect"
                                                       value={selectedYear}
                                                       onChange={(e) => setSelectedYear(e.target.value)}
                                                       style={{...inputStyle, width: 'auto', minWidth: '80px', marginLeft: '5px', display: 'inline-block'}}
                                                       disabled={loadingStats}
                                                   >
                                                       {/* Generate years - e.g., current year and a few past years */}
                                                       {[...Array(5)].map((_, i) => {
                                                           const year = currentYear - i;
                                                           return <option key={year} value={year.toString()}>{year}</option>;
                                                       })}
                                                   </select>
                                               </th>
                                               <th style={thStyle}>
                                                    Month:
                                                    <select
                                                       id="monthSelect"
                                                       value={selectedMonth}
                                                       onChange={(e) => setSelectedMonth(e.target.value)}
                                                       style={{...inputStyle, width: 'auto', minWidth: '100px', marginLeft: '5px', display: 'inline-block'}}
                                                       disabled={loadingStats}
                                                   >
                                                       <option value="">All Months</option> {/* Option for all months */}
                                                       {[...Array(12)].map((_, i) => {
                                                           const monthNumber = i + 1;
                                                           return <option key={monthNumber} value={monthNumber.toString()}>{getMonthName(monthNumber)}</option>;
                                                       })}
                                                   </select>
                                               </th>
                                               <th style={thStyle}>Model</th>
                                               <th style={thStyle}>Count</th>
                                           </tr>
                                       </thead>
                                        {/* Conditionally render tbody */}
                                       {monthlyModelStats.length > 0 ? (
                                           <tbody>
                                               {monthlyModelStats.map((stat, index) => (
                                                   <tr key={index}>
                                                       <td style={tdStyle}>{stat.year}</td>
                                                       <td style={tdStyle}>{getMonthName(stat.month)}</td>
                                                       <td style={tdStyle}>{stat.model}</td>
                                                       <td style={tdStyle}>{stat.count}</td>
                                                   </tr>
                                               ))}
                                           </tbody>
                                       ) : (
                                            <tbody>
                                                <tr>
                                                    <td colSpan={4} style={{...tdStyle, textAlign: 'center', fontStyle: 'italic'}}>No monthly model usage data available for the selected period.</td>
                                                </tr>
                                            </tbody>
                                       )}
                                   </table>
                               )}
                               {statsTimeView === 'alltime' && (
                                   allTimeModelStats.length > 0 ? (
                                       <table style={tableStyle}>
                                           <thead>
                                               <tr>
                                                   <th style={thStyle}>Model</th>
                                                   <th style={thStyle}>Count</th>
                                               </tr>
                                           </thead>
                                           <tbody>
                                               {allTimeModelStats.map((stat, index) => (
                                                   <tr key={index}>
                                                       <td style={tdStyle}>{stat.model}</td>
                                                       <td style={tdStyle}>{stat.count}</td>
                                                   </tr>
                                               ))}
                                           </tbody>
                                       </table>
                                   ) : <p>No all-time model usage data available.</p>
                               )}
                           </>
                       )}
                   </>
                )}
            </details>
       )}

        {/* Custom Providers & Models (Admin Only) --- NEW SECTION --- */}
        {currentUser?.role === 'admin' && (
            <details style={sectionStyle}> {/* Removed 'open' */}
                <summary style={{...h3Style, cursor: 'pointer', display: 'list-item'}}>Custom Providers & Models</summary>

                {/* Provider Management */}
                <div style={{ marginBottom: '25px', paddingBottom: '20px', borderBottom: `1px solid ${isDarkMode ? '#444' : '#eee'}` }}>
                    <h4 style={h4Style}>Custom Providers</h4>
                    {loadingCustomProviders && <p>Loading providers...</p>}
                    {fetchCustomProvidersError && <p style={{ color: 'red' }}>{fetchCustomProvidersError}</p>}
                    {customProviderActionError && <p style={{ color: 'red' }}>{customProviderActionError}</p>}
                    {!loadingCustomProviders && !fetchCustomProvidersError && (
                        customProviders.length > 0 ? (
                            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '15px' }}>
                                {customProviders.map((provider) => (
                                    <li key={provider._id} style={{ borderBottom: `1px solid ${isDarkMode ? '#444' : '#eee'}`, padding: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>{provider.name}</span>
                                        <button
                                            style={customProviderActionLoading === provider._id ? {...deleteButtonStyle, cursor: 'not-allowed', opacity: 0.6} : deleteButtonStyle}
                                            onClick={() => handleDeleteCustomProvider(provider._id, provider.name)}
                                            disabled={customProviderActionLoading === provider._id}
                                        >
                                            {customProviderActionLoading === provider._id ? '...' : 'Delete'}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : <p>No custom providers created yet.</p>
                    )}
                    {/* Add Provider Form */}
                    <form onSubmit={handleAddCustomProvider} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                        <input
                            type="text"
                            placeholder="New Provider Name"
                            value={newCustomProviderName}
                            onChange={(e) => setNewCustomProviderName(e.target.value)}
                            required
                            style={{...inputStyle, flexGrow: 1, minWidth: '200px', maxWidth: '300px'}}
                        />
                        <button type="submit" disabled={customProviderActionLoading === 'add'} style={customProviderActionLoading === 'add' ? disabledButtonStyle : buttonStyle}>
                            {customProviderActionLoading === 'add' ? 'Adding...' : 'Add Provider'}
                        </button>
                    </form>
                </div>

                {/* Model Management */}
                <div>
                    <h4 style={h4Style}>Custom Models</h4>
                    {/* Provider Selector */}
                    <div style={{ marginBottom: '15px' }}>
                        <label htmlFor="customProviderSelect" style={labelStyle}>Select Provider:</label>
                        <select
                            id="customProviderSelect"
                            value={selectedCustomProviderId}
                            onChange={(e) => setSelectedCustomProviderId(e.target.value)}
                            style={{...inputStyle, maxWidth: '350px'}}
                            disabled={loadingCustomProviders || customProviders.length === 0}
                        >
                            <option value="">-- Select a Custom Provider --</option>
                            {customProviders.map(provider => (
                                <option key={provider._id} value={provider._id}>{provider.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Model List & Add Button */}
                    {selectedCustomProviderId && (
                        <>
                            {loadingCustomModels && <p>Loading models...</p>}
                            {fetchCustomModelsError && <p style={{ color: 'red' }}>{fetchCustomModelsError}</p>}
                             {/* Display model action error here */}
                             {modelFormError && !showModelModal && <p style={{ color: 'red' }}>{modelFormError}</p>}
                            {!loadingCustomModels && !fetchCustomModelsError && (
                                customModels.length > 0 ? (
                                    <ul style={{ listStyle: 'none', padding: 0, marginBottom: '15px' }}>
                                        {customModels.map((model) => (
                                            <li key={model._id} style={{ borderBottom: `1px solid ${isDarkMode ? '#444' : '#eee'}`, padding: '10px 0', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ flexGrow: 1, minWidth: '250px' }}>
                                                    <strong>{model.name}</strong>
                                                    <span style={{ marginLeft: '10px', color: isDarkMode ? '#aaa' : '#666', fontSize: '0.9em' }}> (Links to: {model.baseModelIdentifier})</span>
                                                    <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: isDarkMode ? '#bbb' : '#555', whiteSpace: 'pre-wrap', maxHeight: '60px', overflow: 'auto' }}>
                                                        <i>Prompt:</i> {model.systemPrompt || <i>(None)</i>}
                                                    </p>
                                                </div>
                                                <div style={{ flexShrink: 0, display: 'flex', gap: '5px' }}>
                                                    <button style={modelFormLoading ? {...smallButtonStyle, cursor: 'not-allowed', opacity: 0.6} : smallButtonStyle} onClick={() => openEditModelModal(model)} disabled={modelFormLoading}>Edit</button>
                                                    <button style={modelFormLoading ? {...deleteButtonStyle, cursor: 'not-allowed', opacity: 0.6} : deleteButtonStyle} onClick={() => handleDeleteCustomModel(model._id, model.name)} disabled={modelFormLoading}>Delete</button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p>No custom models found for this provider.</p>
                            )}
                            <button onClick={openAddModelModal} style={buttonStyle} disabled={modelFormLoading}>
                                Add New Custom Model
                            </button>
                        </>
                    )}
                </div>
            </details>
        )}
        {/* --- End Custom Providers & Models Section --- */}


       {/* Global Settings (Admin Only) */}
       {currentUser?.role === 'admin' && (
           <section style={sectionStyle}>
               <h3 style={h3Style}>Global Settings</h3>
               {loadingGlobalSettings && <p>Loading settings...</p>}
               {fetchGlobalSettingsError && <p style={{ color: 'red' }}>{fetchGlobalSettingsError}</p>}
               {updateGlobalSettingsError && <p style={{ color: 'red', marginTop: '10px' }}>{updateGlobalSettingsError}</p>}
               {!loadingGlobalSettings && !fetchGlobalSettingsError && globalSettings && (
                   <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                       <label htmlFor="globalStreamingToggle" style={{ ...labelStyle, marginBottom: 0 }}>
                           Enable Streaming Responses Globally:
                       </label>
                       <Switch
                           id="globalStreamingToggle"
                           onChange={handleToggleGlobalStreaming}
                           checked={globalSettings.globalStreamingEnabled}
                           disabled={updateGlobalSettingsLoading}
                           onColor="#86d3ff"
                           onHandleColor="#2693e6"
                           handleDiameter={24}
                           uncheckedIcon={false}
                           checkedIcon={false}
                           boxShadow="0px 1px 5px rgba(0, 0, 0, 0.6)"
                           activeBoxShadow="0px 0px 1px 10px rgba(0, 0, 0, 0.2)"
                           height={18}
                           width={40}
                           className="react-switch"
                       />
                       {updateGlobalSettingsLoading && <span style={{ fontSize: '0.9em', color: isDarkMode ? '#ccc' : '#555' }}>Updating...</span>}
                   </div>
               )}
           </section>
       )}

        {/* Custom Model Add/Edit Modal --- NEW --- */}
        {showModelModal && (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', zIndex: 1000
            }}>
                <div style={{
                    background: isDarkMode ? '#333' : 'white', padding: '25px', borderRadius: '8px',
                    width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',
                    color: isDarkMode ? '#e0e0e0' : 'inherit'
                }}>
                    <h4 style={{ marginTop: 0, marginBottom: '20px' }}>
                        {editingCustomModel ? 'Edit Custom Model' : 'Add New Custom Model'}
                    </h4>
                    <form onSubmit={handleSaveCustomModel}>
                        {modelFormError && <p style={{ color: 'red', marginBottom: '15px' }}>{modelFormError}</p>}
                        <div style={{ marginBottom: '15px' }}>
                            <label htmlFor="modelFormName" style={labelStyle}>Custom Model Name:</label>
                            <input
                                type="text"
                                id="modelFormName"
                                value={modelFormName}
                                onChange={(e) => setModelFormName(e.target.value)}
                                required
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label htmlFor="modelFormBaseIdentifier" style={labelStyle}>Link to Base Model:</label>
                            {loadingBaseModels ? <p>Loading base models...</p> : fetchBaseModelsError ? <p style={{color: 'red'}}>{fetchBaseModelsError}</p> : (
                                <select
                                    id="modelFormBaseIdentifier"
                                    value={modelFormBaseIdentifier}
                                    onChange={(e) => setModelFormBaseIdentifier(e.target.value)}
                                    required
                                    style={inputStyle}
                                >
                                    <option value="">-- Select Base Model --</option>
                                    {Object.entries(baseModelsForDropdown)
                                        .sort(([providerA], [providerB]) => providerA.localeCompare(providerB)) // Sort providers
                                        .map(([provider, models]) => (
                                            <optgroup label={provider} key={provider}>
                                                {models
                                                    .sort() // Sort models within provider
                                                    .map(modelName => (
                                                        <option key={modelName} value={modelName}>{modelName}</option>
                                                ))}
                                            </optgroup>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label htmlFor="modelFormSystemPrompt" style={labelStyle}>System Prompt (Optional):</label>
                            <textarea
                                id="modelFormSystemPrompt"
                                value={modelFormSystemPrompt}
                                onChange={(e) => setModelFormSystemPrompt(e.target.value)}
                                rows={6}
                                style={{...inputStyle, height: 'auto', maxWidth: '100%'}} // Adjust style for textarea
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button type="button" onClick={closeModelModal} style={{...smallButtonStyle, background: isDarkMode ? '#555' : '#ccc'}}>Cancel</button>
                            <button type="submit" disabled={modelFormLoading} style={modelFormLoading ? disabledButtonStyle : buttonStyle}>
                                {modelFormLoading ? 'Saving...' : (editingCustomModel ? 'Save Changes' : 'Add Model')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        {/* --- End Modal --- */}

    </div>
  );
};

export default SettingsPage;
