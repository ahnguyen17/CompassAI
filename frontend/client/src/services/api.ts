import axios from 'axios';

// --- Interfaces ---

// Generic API Response structure (assuming backend follows this pattern)
export interface ApiResponse<T> {
    success: boolean;
    count?: number; // Optional count, often used for lists
    data: T;
    error?: string; // Optional error message
}

// --- User Statistics Interfaces ---
// Interface for Monthly User Usage Statistics (Note: model field might be unused now)
export interface MonthlyUserStat {
    year: number;
    month: number;
    user: string; // User identifier (e.g., email)
    // model: string; // Model field is no longer returned by this endpoint
    count: number;
}

// Interface for All-Time User Usage Statistics (Note: model field might be unused now)
export interface AllTimeUserStat {
    user: string; // User identifier (e.g., email)
    // model: string; // Model field is no longer returned by this endpoint
    count: number;
}

// --- Model Statistics Interfaces ---
// Interface for Monthly Model Usage Statistics
export interface MonthlyModelStat {
    year: number;
    month: number;
    model: string;
    count: number;
}

// Interface for All-Time Model Usage Statistics
export interface AllTimeModelStat {
    model: string;
    count: number;
}

// --- Custom AI Interfaces ---
export interface KnowledgeBaseFile {
    _id: string;
    originalName: string;
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    extractedText: string;
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
    processingError: string;
    createdAt: string;
    updatedAt: string;
}

export interface CustomAIData {
    _id: string;
    userId: string;
    name: string;
    model: string;
    instructions: string;
    knowledgeBaseFiles: KnowledgeBaseFile[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CustomAIChatContext {
    _id: string;
    name: string;
    model: string;
    instructions: string;
    knowledgeBaseText: string;
    fileCount: number;
    totalSize: number;
}

// --- Dynamic Backend URL ---

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
    const backendPort = 5000; // Make sure this matches your backend server port

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

// --- User Memory Interfaces ---
export interface ContextItemData {
  _id: string;
  text: string;
  source: 'manual' | 'chat_auto_extracted';
  createdAt: string; // Dates will be strings from JSON
  updatedAt: string;
}

export interface UserMemoryData {
  _id: string;
  userId: string;
  isGloballyEnabled: boolean;
  maxContexts: number;
  contexts: ContextItemData[];
  createdAt: string;
  updatedAt: string;
}

// --- User Memory API Functions ---

export const getUserMemory = async (): Promise<ApiResponse<UserMemoryData>> => {
  const response = await apiClient.get<ApiResponse<UserMemoryData>>('/usermemory');
  return response.data;
};

export const updateUserMemorySettings = async (settings: {
  isGloballyEnabled?: boolean;
  maxContexts?: number;
}): Promise<ApiResponse<UserMemoryData>> => {
  const response = await apiClient.put<ApiResponse<UserMemoryData>>(
    '/usermemory/settings',
    settings
  );
  return response.data;
};

export const addMemoryContext = async (context: {
  text: string;
  source?: 'manual' | 'chat_auto_extracted'; // Source is optional, defaults to 'manual' in backend if not provided by frontend for manual add
}): Promise<ApiResponse<UserMemoryData>> => {
  const payload = { ...context };
  if (!payload.source) {
    payload.source = 'manual'; // Ensure source is set if frontend doesn't send it
  }
  const response = await apiClient.post<ApiResponse<UserMemoryData>>(
    '/usermemory/contexts',
    payload
  );
  return response.data;
};

export const updateMemoryContext = async (
  contextId: string,
  context: { text: string }
): Promise<ApiResponse<UserMemoryData>> => {
  const response = await apiClient.put<ApiResponse<UserMemoryData>>(
    `/usermemory/contexts/${contextId}`,
    context
  );
  return response.data;
};

export const deleteMemoryContext = async (
  contextId: string
): Promise<ApiResponse<UserMemoryData>> => { // Backend returns updated UserMemory
  const response = await apiClient.delete<ApiResponse<UserMemoryData>>(
    `/usermemory/contexts/${contextId}`
  );
  return response.data;
};

export const clearAllMemoryContexts = async (): Promise<ApiResponse<UserMemoryData>> => {
  const response = await apiClient.post<ApiResponse<UserMemoryData>>(
    '/usermemory/contexts/clear'
  );
  return response.data;
};

// --- Custom AI API Functions ---

export const getCustomAIs = async (): Promise<ApiResponse<CustomAIData[]>> => {
  const response = await apiClient.get<ApiResponse<CustomAIData[]>>('/customai');
  return response.data;
};

export const getCustomAI = async (id: string): Promise<ApiResponse<CustomAIData>> => {
  const response = await apiClient.get<ApiResponse<CustomAIData>>(`/customai/${id}`);
  return response.data;
};

export const createCustomAI = async (data: {
  name: string;
  model: string;
  instructions: string;
}): Promise<ApiResponse<CustomAIData>> => {
  const response = await apiClient.post<ApiResponse<CustomAIData>>('/customai', data);
  return response.data;
};

export const updateCustomAI = async (
  id: string,
  data: { name?: string; model?: string; instructions?: string }
): Promise<ApiResponse<CustomAIData>> => {
  const response = await apiClient.put<ApiResponse<CustomAIData>>(`/customai/${id}`, data);
  return response.data;
};

export const deleteCustomAI = async (id: string): Promise<ApiResponse<{}>> => {
  const response = await apiClient.delete<ApiResponse<{}>>(`/customai/${id}`);
  return response.data;
};

export const duplicateCustomAI = async (id: string): Promise<ApiResponse<CustomAIData>> => {
  const response = await apiClient.post<ApiResponse<CustomAIData>>(`/customai/${id}/duplicate`);
  return response.data;
};

export const getCustomAIForChat = async (id: string): Promise<ApiResponse<CustomAIChatContext>> => {
  const response = await apiClient.get<ApiResponse<CustomAIChatContext>>(`/customai/${id}/chat-context`);
  return response.data;
};

export default apiClient;
