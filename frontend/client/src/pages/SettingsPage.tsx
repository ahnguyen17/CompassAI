import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/api';

// Interfaces (assuming these are defined correctly elsewhere or here)
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

interface SettingsPageProps {
    currentUser: User | null;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ currentUser }) => {
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

  // User Management State
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [fetchUsersError, setFetchUsersError] = useState('');
  const [userActionError, setUserActionError] = useState('');
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');

  // Referral Code State
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [loadingReferralCodes, setLoadingReferralCodes] = useState(true);
  const [fetchReferralCodesError, setFetchReferralCodesError] = useState('');
  const [addReferralCodeError, setAddReferralCodeError] = useState('');
  const [addReferralCodeLoading, setAddReferralCodeLoading] = useState(false);
  const [deleteReferralCodeLoading, setDeleteReferralCodeLoading] = useState<string | null>(null);
  const [newReferralCode, setNewReferralCode] = useState('');
  const [newReferralDescription, setNewReferralDescription] = useState('');

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

  // --- Fetch Users ---
  const fetchUsers = async () => {
      setLoadingUsers(true); setFetchUsersError('');
      try {
          const response = await apiClient.get('/users');
          if (response.data?.success) setUsers(response.data.data);
          else setFetchUsersError('Failed to load users.');
      } catch (err: any) { setFetchUsersError(err.response?.data?.error || 'Error loading users.'); if (err.response?.status === 401) setFetchUsersError('Unauthorized.'); if (err.response?.status === 403) setFetchUsersError('Forbidden.');
      } finally { setLoadingUsers(false); }
  };

  // --- Fetch Referral Codes ---
  const fetchReferralCodes = async () => {
      setLoadingReferralCodes(true); setFetchReferralCodesError('');
      try {
          const response = await apiClient.get('/referralcodes');
          if (response.data?.success) setReferralCodes(response.data.data);
          else setFetchReferralCodesError('Failed to load referral codes.');
      } catch (err: any) { setFetchReferralCodesError(err.response?.data?.error || 'Error loading referral codes.'); if (err.response?.status === 401) setFetchReferralCodesError('Unauthorized.'); if (err.response?.status === 403) setFetchReferralCodesError('Forbidden.');
      } finally { setLoadingReferralCodes(false); }
  };

  useEffect(() => {
    fetchApiKeys();
    if (currentUser?.role === 'admin') { fetchUsers(); fetchReferralCodes(); }
    else { setLoadingUsers(false); setLoadingReferralCodes(false); }
  }, [currentUser]);

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

  // --- User Handlers ---
   const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault(); setUserActionLoading('create'); setUserActionError('');
       if (!newUsername || !newUserEmail || !newUserPassword) { setUserActionError('Username, Email, and Password required.'); setUserActionLoading(null); return; }
       try {
           const response = await apiClient.post('/users', { username: newUsername, email: newUserEmail, password: newUserPassword });
           if (response.data?.success) { setNewUsername(''); setNewUserEmail(''); setNewUserPassword(''); fetchUsers(); }
           else { setUserActionError(response.data?.error || 'Failed to create user.'); }
       } catch (err: any) { setUserActionError(err.response?.data?.error || 'Error creating user.');
       } finally { setUserActionLoading(null); }
    };
   const handleDeleteUser = async (userId: string, username: string) => {
        if (!window.confirm(`Delete user "${username}"?`)) return;
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

   // --- Referral Code Handlers ---
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

  return (
    <div>
      <h2>{t('settings_title')}</h2>

      {/* API Key Management */}
      <section style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h3>{t('settings_api_keys_title')}</h3>
        <h4>Existing Keys (Sorted by Priority)</h4>
        {loadingApiKeys && <p>Loading...</p>}
        {fetchApiKeysError && <p style={{ color: 'red' }}>{fetchApiKeysError}</p>}
        {!loadingApiKeys && !fetchApiKeysError && ( apiKeys.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {apiKeys.map((key) => (
                <li key={key._id} style={{ borderBottom: '1px solid #eee', padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flexGrow: 1, marginRight: '10px' }}>
                    <strong>{key.providerName}</strong>
                    <span style={{ marginLeft: '10px', color: '#666' }}> Key: *****{key.keyValue.slice(-4)} </span>
                    <span style={{ marginLeft: '10px', color: key.isEnabled ? 'green' : 'red' }}> ({key.isEnabled ? 'Enabled' : 'Disabled'}) </span>
                    <span style={{ marginLeft: '15px' }}>
                        Priority: {editingApiKeyId === key._id ? (
                            <>
                                <input type="number" value={editPriorityValue} onChange={(e) => setEditPriorityValue(parseInt(e.target.value, 10) || 99)} min="1" style={{ width: '50px', marginLeft: '5px', marginRight: '5px' }} />
                                <button onClick={() => handleSavePriority(key._id)} disabled={apiKeyActionLoading === key._id} style={{ marginRight: '5px' }}>Save</button>
                                <button type="button" onClick={handleCancelEditPriority}>Cancel</button>
                            </>
                        ) : ( <> {key.priority} <button onClick={() => handleEditPriority(key)} style={{ marginLeft: '10px', fontSize: '0.8em', cursor: 'pointer' }}>Edit</button> </> )}
                    </span>
                  </div>
                  <div>
                    <button style={{ marginRight: '5px' }} onClick={() => handleToggleApiKey(key)} disabled={apiKeyActionLoading === key._id || !!editingApiKeyId}> {apiKeyActionLoading === key._id ? '...' : (key.isEnabled ? 'Disable' : 'Enable')} </button>
                    <button style={{ color: 'red' }} onClick={() => handleDeleteApiKey(key._id, key.providerName)} disabled={apiKeyActionLoading === key._id || !!editingApiKeyId}> {apiKeyActionLoading === key._id ? '...' : 'Delete'} </button>
                  </div>
                </li>
              ))}
            </ul> ) : <p>No API keys found.</p> )}
         <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
            <h5>Add New API Key</h5>
            <form onSubmit={handleAddKey}> <input type="text" placeholder="Provider Name (e.g., Anthropic)" value={newProviderName} onChange={(e) => setNewProviderName(e.target.value)} required style={{ marginRight: '10px', padding: '8px' }} /> <input type="password" placeholder="API Key Value" value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} required style={{ marginRight: '10px', padding: '8px' }} /> <button type="submit" disabled={addApiKeyLoading} style={{ padding: '8px 15px' }}> {addApiKeyLoading ? 'Adding...' : 'Add Key'} </button> {addApiKeyError && <p style={{ color: 'red', marginTop: '10px' }}>{addApiKeyError}</p>} </form>
         </div>
         {apiKeyActionError && <p style={{ color: 'red', marginTop: '10px' }}>{apiKeyActionError}</p>}
      </section>

      {/* User Management (Admin Only) */}
      {currentUser?.role === 'admin' && ( <section style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}> <h3>{t('settings_users_title')}</h3> {loadingUsers && <p>Loading users...</p>} {fetchUsersError && <p style={{ color: 'red' }}>{fetchUsersError}</p>} {!loadingUsers && !fetchUsersError && ( users.length > 0 ? ( <ul style={{ listStyle: 'none', padding: 0 }}> {users.map((user) => ( <li key={user._id} style={{ borderBottom: '1px solid #eee', padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}> <div> {editingUserId === user._id ? ( <form onSubmit={(e) => handleUpdateUser(e, user._id)} style={{ display: 'flex', alignItems: 'center', width: '100%' }}> <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} required style={{ padding: '5px', marginRight: '5px' }} /> <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required style={{ padding: '5px', marginRight: '10px' }} /> <select value={editRole} onChange={(e) => setEditRole(e.target.value as 'user' | 'admin')} style={{ padding: '5px', marginRight: '10px' }}> <option value="user">User</option> <option value="admin">Admin</option> </select> <button type="submit" disabled={userActionLoading === user._id} style={{ marginRight: '5px' }}> {userActionLoading === user._id ? 'Saving...' : 'Save'} </button> <button type="button" onClick={handleCancelEdit}>Cancel</button> {userActionError && editingUserId === user._id && <p style={{ color: 'red', marginLeft: '10px', marginBottom: 0 }}>{userActionError}</p>} </form> ) : ( <> <div> <strong>{user.username}</strong> ({user.email}) - Role: {user.role} <span style={{ marginLeft: '10px', color: '#666', fontSize: '0.9em' }}> Joined: {new Date(user.createdAt).toLocaleDateString()} </span> {user._id === currentUser?._id && <span style={{ marginLeft: '10px', color: 'blue' }}>(You)</span>} </div> <div> <button style={{ marginRight: '5px' }} onClick={() => handleEditUser(user)} disabled={!!editingUserId || userActionLoading === user._id || user._id === currentUser?._id}> Edit </button> <button style={{ color: 'red' }} onClick={() => handleDeleteUser(user._id, user.username)} disabled={!!editingUserId || userActionLoading === user._id || user._id === currentUser?._id}> {userActionLoading === user._id ? 'Deleting...' : 'Delete'} </button> </div> </> )} </div> </li> ))} </ul> ) : <p>No other users found.</p> )} <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}> <h5>Create New User</h5> <form onSubmit={handleCreateUser}> <input type="text" placeholder="Username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required style={{ marginRight: '10px', padding: '8px' }} /> <input type="email" placeholder="Email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required style={{ marginRight: '10px', padding: '8px' }} /> <input type="password" placeholder="Password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} required style={{ marginRight: '10px', padding: '8px' }} /> <button type="submit" disabled={userActionLoading === 'create'} style={{ padding: '8px 15px' }}> {userActionLoading === 'create' ? 'Creating...' : 'Create User'} </button> </form> {userActionError && <p style={{ color: 'red', marginTop: '10px' }}>{userActionError}</p>} </div> </section> )}

       {/* Referral Code Management (Admin Only) */}
       {currentUser?.role === 'admin' && ( <section style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}> <h3>{t('settings_referral_title')}</h3> {loadingReferralCodes && <p>Loading codes...</p>} {fetchReferralCodesError && <p style={{ color: 'red' }}>{fetchReferralCodesError}</p>} {!loadingReferralCodes && !fetchReferralCodesError && ( referralCodes.length > 0 ? ( <ul style={{ listStyle: 'none', padding: 0 }}> {referralCodes.map((refCode) => ( <li key={refCode._id} style={{ borderBottom: '1px solid #eee', padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}> <div> <code>{refCode.code}</code> {refCode.description && <span style={{ marginLeft: '10px', color: '#6c757d' }}>({refCode.description})</span>} <span style={{ marginLeft: '10px', color: '#666', fontSize: '0.9em' }}> Created: {new Date(refCode.createdAt).toLocaleDateString()} </span> </div> <button style={{ color: 'red' }} onClick={() => handleDeleteReferralCode(refCode._id, refCode.code)} disabled={deleteReferralCodeLoading === refCode._id}> {deleteReferralCodeLoading === refCode._id ? '...' : 'Delete'} </button> </li> ))} </ul> ) : <p>No active referral codes.</p> )} <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}> <h5>Add New Referral Code (Max: 5)</h5> <form onSubmit={handleAddReferralCode}> <input type="text" placeholder="New Code" value={newReferralCode} onChange={(e) => setNewReferralCode(e.target.value)} required style={{ marginRight: '10px', padding: '8px' }} /> <input type="text" placeholder="Description (Optional)" value={newReferralDescription} onChange={(e) => setNewReferralDescription(e.target.value)} style={{ marginRight: '10px', padding: '8px' }} /> <button type="submit" disabled={addReferralCodeLoading || referralCodes.length >= 5} style={{ padding: '8px 15px' }}> {addReferralCodeLoading ? 'Adding...' : 'Add Code'} </button> {referralCodes.length >= 5 && <p style={{ color: 'orange', fontSize: '0.9em', marginTop: '5px' }}>Maximum number of codes reached.</p>} {addReferralCodeError && <p style={{ color: 'red', marginTop: '10px' }}>{addReferralCodeError}</p>} </form> </div> </section> )}

    </div>
  );
};

export default SettingsPage;
