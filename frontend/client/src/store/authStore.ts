import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import apiClient from '../services/api';

// Define User interface matching backend (excluding password)
interface CurrentUser {
    _id: string;
    username: string;
    email: string;
    role: 'user' | 'admin';
    lastActiveChatSessionId?: string | null; // Add optional field
    createdAt: string;
}

interface AuthState {
    isLoggedIn: boolean;
    currentUser: CurrentUser | null;
    authLoading: boolean;
    isDarkMode: boolean;
    fetchCurrentUser: () => Promise<void>;
    handleLogout: (navigate: (path: string) => void) => void; // Pass navigate function
    handleAuthSuccess: () => void;
    toggleTheme: () => void;
    setIsLoggedIn: (status: boolean) => void; // Added for direct control if needed
    setCurrentUser: (user: CurrentUser | null) => void; // Added for direct control
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

            handleLogout: (navigate) => {
                localStorage.removeItem('authToken');
                set({ isLoggedIn: false, currentUser: null });
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
