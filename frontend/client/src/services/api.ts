import axios from 'axios';

// Determine backend URL dynamically
const getBaseUrl = () => {
    // 1. Check for explicit deployment environment variable
    const viteApiUrl = import.meta.env.VITE_API_BASE_URL;
    if (viteApiUrl) {
        console.log('Using VITE_API_BASE_URL:', viteApiUrl);
        return viteApiUrl;
    }

    // 2. Handle local development access (localhost vs. network IP)
    const hostname = window.location.hostname;
    const backendPort = 5001; // Make sure this matches your backend server port

    // If accessing via IP address (likely from mobile on local network)
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        const baseUrl = `http://${hostname}:${backendPort}/api/v1`;
        console.log('Using local network IP for API:', baseUrl);
        return baseUrl;
    }

    // Default to localhost for standard local development
    const defaultUrl = `http://localhost:${backendPort}/api/v1`;
    console.log('Using default localhost for API:', defaultUrl);
    return defaultUrl;
};

const API_BASE_URL = getBaseUrl();

// Create an Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional: Add interceptor to include JWT token in requests
apiClient.interceptors.request.use(
  (config) => {
    // Get token from local storage (or wherever it's stored after login)
    const token = localStorage.getItem('authToken'); // Example storage key
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Log the request URL being used
    // console.log(`Requesting URL: ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Add interceptor to handle common responses or errors (e.g., 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    if (error.response && error.response.status === 401) {
      // Handle unauthorized access, e.g., redirect to login
      console.error('Unauthorized access - 401');
      // Remove token and redirect?
      // localStorage.removeItem('authToken');
      // window.location.href = '/login'; // Force redirect
    }
    return Promise.reject(error);
  }
);


export default apiClient;
