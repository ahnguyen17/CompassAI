import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import apiClient from '../services/api';

// Define User interface matching backend (excluding password)
interface CurrentUser {
    _id: string;
    username: string;
    email: string;
    role: 'user' | 'admin';
    createdAt: string; // Keep original createdAt for User
}

// Define ChatSession interface matching backend/ChatPage
interface ChatSession {
    _id: string;
    title: string;
    createdAt: string;
    isShared?: boolean;
    shareId?: string;
}

// Define NavigateFunction type locally if not imported globally
type NavigateFunction = (path: string) => void;

interface AuthState {
    isLoggedIn: boolean;
    currentUser: CurrentUser | null;
    authLoading: boolean;
    isDarkMode: boolean;
    sessions: ChatSession[]; // Add sessions state
    sessionsLoading: boolean; // Add loading state for sessions
    sessionsError: string | null; // Add error state for sessions
    fetchCurrentUser: () => Promise<void>;
    fetchSessions: () => Promise<void>; // Add fetch sessions action
    handleLogout: (navigate: NavigateFunction) => void; // Pass navigate function
    handleAuthSuccess: () => void;
    toggleTheme: () => void;
    setIsLoggedIn: (status: boolean) => void; // Added for direct control if needed
    setCurrentUser: (user: CurrentUser | null) => void; // Added for direct control
    startNewChat: (navigate: NavigateFunction) => Promise<void>;
    deleteSession: (sessionId: string, currentSessionId: string | null, navigate: NavigateFunction) => Promise<void>; // Add delete session action
    setSessions: (sessions: ChatSession[]) => void; // Add setter for sessions
}


// Create the store with persist middleware for dark mode
const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // --- State ---
            isLoggedIn: false,
            currentUser: null,
            authLoading: true, // Start loading until first check completes
            isDarkMode: false, // Default to light mode
            sessions: [], // Initialize sessions state
            sessionsLoading: true, // Initialize loading state
            sessionsError: null, // Initialize error state

            // --- Actions ---
            fetchCurrentUser: async () => {
                set({ authLoading: true });
                const token = localStorage.getItem('authToken');
                if (token) {
                    try {
                        // apiClient interceptor adds the token
                        const response = await apiClient.get('/auth/me');
                        if (response.data?.success) {
                            set({
                                currentUser: response.data.data,
                                isLoggedIn: true,
                                authLoading: false,
                            });
                        } else {
                            // Token invalid/expired
                            localStorage.removeItem('authToken');
                            set({
                                isLoggedIn: false,
                                currentUser: null,
                                authLoading: false,
                            });
                        }
                    } catch (error) {
                        console.error("Error fetching current user:", error);
                        localStorage.removeItem('authToken');
                        set({
                            isLoggedIn: false,
                            currentUser: null,
                            authLoading: false,
                        });
                    }
                } else {
                    set({
                        isLoggedIn: false,
                        currentUser: null,
                        authLoading: false,
                    });
                }
            },

            fetchSessions: async () => {
                set({ sessionsLoading: true, sessionsError: null });
                try {
                    const response = await apiClient.get('/chatsessions');
                    if (response.data?.success) {
                        set({ sessions: response.data.data, sessionsLoading: false });
                    } else {
                        set({ sessionsError: 'Failed to load chat sessions.', sessionsLoading: false });
                    }
                } catch (err: any) {
                    console.error("Error fetching sessions:", err);
                    set({ sessionsError: err.response?.data?.error || 'Error loading sessions.', sessionsLoading: false });
                    // Don't navigate here, let the component decide based on error/status
                }
            },


            handleLogout: (navigate) => {
                localStorage.removeItem('authToken');
                set({ isLoggedIn: false, currentUser: null, sessions: [], sessionsLoading: true, sessionsError: null }); // Clear sessions on logout
                navigate('/login'); // Redirect after logout
            },

            handleAuthSuccess: () => {
                // Fetch user immediately after successful login/register
                get().fetchCurrentUser();
                // Note: isLoggedIn and currentUser will be set by fetchCurrentUser
            },

            toggleTheme: () => {
                set((state) => {
                    const newMode = !state.isDarkMode;
                    if (newMode) {
                        document.body.classList.add('dark');
                    } else {
                        document.body.classList.remove('dark');
                    }
                    return { isDarkMode: newMode };
                });
            },

            // Direct setters (optional, but can be useful)
            setIsLoggedIn: (status: boolean) => set({ isLoggedIn: status }),
            setCurrentUser: (user: CurrentUser | null) => set({ currentUser: user }),

            // --- New Chat Action ---
            startNewChat: async (navigate) => {
                console.log("Attempting to start new chat via store action...");
                // Optionally set loading/error state specific to this action if needed
                try {
                    const response = await apiClient.post('/chatsessions', { title: 'New Chat' });
                    if (response.data?.success) {
                        const newSession: ChatSession = response.data.data;
                        console.log("New chat session created:", newSession._id);
                        // Prepend the new session to the global list
                        set((state) => ({ sessions: [newSession, ...state.sessions] }));
                        // Trigger navigation AFTER updating state
                        navigate(`/chat/${newSession._id}`);
                    } else {
                        console.error('Failed to create new chat session (API Error):', response.data?.error);
                        set({ sessionsError: `Failed to create chat: ${response.data?.error || 'Unknown API error'}` }); // Update error state
                    }
                } catch (err: any) {
                    console.error('Error creating new chat session (Network/Server Error):', err);
                    set({ sessionsError: `Error creating chat: ${err.response?.data?.error || err.message || 'Network error'}` }); // Update error state
                    if (err.response?.status === 401) {
                        get().handleLogout(navigate); // Logout on auth error
                    }
                }
            },

            deleteSession: async (sessionId, currentSessionId, navigate) => {
                // Optionally set loading/error state specific to deletion
                const originalSessions = get().sessions;
                const deletedSessionIndex = originalSessions.findIndex(s => s._id === sessionId);

                // Optimistic update: remove session immediately
                set({ sessions: originalSessions.filter(s => s._id !== sessionId) });

                try {
                    const response = await apiClient.delete(`/chatsessions/${sessionId}`);
                    if (!response.data?.success) {
                        console.error('Failed to delete chat session (API Error):', response.data?.error);
                        set({ sessions: originalSessions, sessionsError: `Failed to delete: ${response.data?.error || 'API error'}` }); // Revert on failure
                    } else {
                        console.log("Session deleted successfully:", sessionId);
                        // If the deleted session was the currently viewed one, navigate
                        if (currentSessionId === sessionId) {
                            const remainingSessions = get().sessions; // Get the updated list
                            let nextSessionToSelect: ChatSession | null = null;
                            if (remainingSessions.length > 0) {
                                const nextIndex = Math.min(deletedSessionIndex, remainingSessions.length - 1);
                                nextSessionToSelect = remainingSessions[nextIndex >= 0 ? nextIndex : 0]; // Ensure index is valid
                            }

                            if (nextSessionToSelect) {
                                navigate(`/chat/${nextSessionToSelect._id}`);
                            } else {
                                navigate('/'); // Navigate to base route if no sessions left
                            }
                        }
                        // Clear error if deletion was successful
                        set({ sessionsError: null });
                    }
                } catch (err: any) {
                    console.error('Error deleting session (Network/Server Error):', err);
                    set({ sessions: originalSessions, sessionsError: `Error deleting: ${err.response?.data?.error || err.message || 'Network error'}` }); // Revert on failure
                    if (err.response?.status === 401) {
                        get().handleLogout(navigate); // Logout on auth error
                    }
                }
            },

            // Setter for sessions (useful for optimistic updates or direct manipulation)
            setSessions: (sessions: ChatSession[]) => set({ sessions }),


        }),
        {
            name: 'app-settings', // Name for localStorage key
            storage: createJSONStorage(() => localStorage), // Use localStorage
            partialize: (state) => ({ isDarkMode: state.isDarkMode }), // Only persist isDarkMode
        }
    )
);

// Initialize dark mode from persisted state on load
const initialDarkMode = useAuthStore.getState().isDarkMode;
if (initialDarkMode) {
    document.body.classList.add('dark');
} else {
    document.body.classList.remove('dark');
}

// Initial fetch of current user if token exists
// We do this outside the store definition to trigger it on app load
// but ensure it only runs once.
const token = localStorage.getItem('authToken');
if (token) {
    useAuthStore.getState().fetchCurrentUser();
} else {
    // If no token, we know auth is not loading anymore
    useAuthStore.setState({ authLoading: false });
}


export default useAuthStore;
