import * as React from 'react'; // Explicit import
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { MdSend, MdAttachFile, MdMic, MdMicOff, MdLightbulbOutline, MdClose, MdChevronLeft, MdShare, MdLinkOff, MdAddCircleOutline, MdAutoAwesome } from 'react-icons/md'; // Added MdAutoAwesome
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
 // Import both light and dark themes
 import { prism, okaidia } from 'react-syntax-highlighter/dist/esm/styles/prism';
 import apiClient from '../services/api';
 import CopyButton from '../components/CopyButton';
import ModelSelectorDropdown from '../components/ModelSelectorDropdown'; // Import the new component
import useAuthStore from '../store/authStore'; // Import the store (ChatSession is defined within)
import { useTranslation } from 'react-i18next';
import styles from './ChatPage.module.css'; // Import CSS Module

// --- Constants ---
// Models known to potentially include reasoning steps (for auto-toggle)
const REASONING_MODELS = [
    "perplexity/sonar-reasoning-pro",
    "perplexity/sonar-reasoning",
    "perplexity/r1-1776",
    "deepseek-reasoner",
    "o3-mini" // Added per user request, assuming it provides reasoning
];

// Models known to embed reasoning in <think> tags within main content
const THINK_TAG_MODELS = [
    "perplexity/sonar-reasoning-pro",
    "perplexity/sonar-reasoning",
    "perplexity/r1-1776"
];

// --- Interfaces ---
// Interface for a single Custom Model (matching dropdown component)
interface CustomModelData {
    _id: string;
    name: string;
    providerName: string;
    baseModelIdentifier: string;
    baseModelSupportsVision: boolean; // Added to match ModelSelectorDropdown and backend
}

// ADD THIS: Interface for a single Base Model object (new structure)
interface BaseModelData {
    name: string;
    supportsVision: boolean;
}

// UPDATE THIS: Interface for the combined data structure from the backend
interface CombinedAvailableModels {
  baseModels: { [provider: string]: BaseModelData[] }; // Changed string[] to BaseModelData[]
  customModels: CustomModelData[];
}
// Re-define ChatSession locally as it's used extensively here
interface ChatSession { _id: string; title: string; createdAt: string; lastAccessedAt: string; lastMessageTimestamp?: string; isShared?: boolean; shareId?: string; }
// Update ChatMessage interface to include optional reasoningContent
interface ChatMessage {
    _id: string;
    sender: 'user' | 'ai';
    content: string;
    timestamp: string;
    modelUsed?: string | null;
    reasoningContent?: string | null; // Add optional reasoning content
    citations?: any[]; // Add optional citations array
    fileInfo?: { filename: string; originalname: string; mimetype: string; size: number; path: string; }
 }

 // Define props interface
 interface ChatPageProps {
   isSidebarVisible: boolean;
   toggleSidebarVisibility: () => void; // Add toggle function prop
 }

 // Interface for date-grouped sessions
interface DateGroup {
  title: string;
  sessions: ChatSession[];
}

// Helper function to group sessions by date
const groupSessionsByDate = (sessions: ChatSession[], currentDateTime: Date): DateGroup[] => {
  console.log('=== GROUPING SESSIONS DEBUG ===');
  console.log('Total sessions to group:', sessions.length);
  console.log('Current date/time:', currentDateTime);

  const groups: { [key: string]: ChatSession[] } = {};
  const outputOrder: string[] = [];

  const today = new Date(currentDateTime);
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const startOfThisYear = new Date(today.getFullYear(), 0, 1);
  const startOfPreviousYear = new Date(today.getFullYear() - 1, 0, 1);
  const startOfTwoYearsAgo = new Date(today.getFullYear() - 2, 0, 1); // For "Older" category

  console.log('Date boundaries:');
  console.log('  Today:', today);
  console.log('  Seven days ago:', sevenDaysAgo);
  console.log('  Thirty days ago:', thirtyDaysAgo);
  console.log('  Start of this year:', startOfThisYear);
  console.log('  Start of previous year:', startOfPreviousYear);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Define group titles, also helps with ordering
  const groupTitles = {
    previous7Days: "date_group_previous_7_days", // Translation key
    previous30Days: "date_group_previous_30_days", // Translation key
    // Dynamic titles for months and years will be generated
  };

  sessions.forEach((session, index) => {
    // Prioritize lastMessageTimestamp, then createdAt for grouping
    const dateToUse = session.lastMessageTimestamp || session.createdAt; // MODIFIED LINE
    const sessionDate = new Date(dateToUse);
    sessionDate.setHours(0, 0, 0, 0); // Normalize session date to start of day for comparison

    console.log(`Session ${index + 1} (${session._id}):`, {
      title: session.title,
      lastMessageTimestamp: session.lastMessageTimestamp,
      lastAccessedAt: session.lastAccessedAt, // Still log for context
      createdAt: session.createdAt,
      dateToUse: dateToUse,
      sessionDate: sessionDate,
      isLastMessageTimestampUsed: !!session.lastMessageTimestamp,
      isCreatedAtUsedAsFallback: !session.lastMessageTimestamp && !!session.createdAt // New debug field
    });

    let groupKey: string | null = null;

    if (sessionDate >= sevenDaysAgo && sessionDate <= today) {
      groupKey = groupTitles.previous7Days;
    } else if (sessionDate >= thirtyDaysAgo && sessionDate < sevenDaysAgo) {
      groupKey = groupTitles.previous30Days;
    } else if (sessionDate >= startOfThisYear && sessionDate < thirtyDaysAgo) { 
      // Current year, older than 30 days: Group by month of current year
      groupKey = `${monthNames[sessionDate.getMonth()]} ${sessionDate.getFullYear()}`;
    } else if (sessionDate >= startOfPreviousYear && sessionDate < startOfThisYear) {
      // Previous year, by month
      groupKey = `${monthNames[sessionDate.getMonth()]} ${sessionDate.getFullYear()}`;
    } else if (sessionDate < startOfPreviousYear) {
      // Older years
      groupKey = `${sessionDate.getFullYear()}`;
    }

    console.log(`  -> Assigned to group: ${groupKey}`);

    if (groupKey) {
      if (!groups[groupKey]) {
        groups[groupKey] = [];
        if (!outputOrder.includes(groupKey)) { // Keep track of order of appearance for dynamic keys
            // Add dynamic keys in a somewhat logical order initially
            if (groupKey.includes(String(today.getFullYear() -1))) { // Previous year months
                const existingPrevYearMonths = outputOrder.filter(k => k.includes(String(today.getFullYear() -1)));
                if (existingPrevYearMonths.length === 0) {
                    const thirtyDaysIndex = outputOrder.indexOf(groupTitles.previous30Days);
                    if (thirtyDaysIndex !== -1) {
                        outputOrder.splice(thirtyDaysIndex + 1, 0, groupKey);
                    } else {
                        outputOrder.push(groupKey);
                    }
                } else {
                     // Simple push, will be sorted later
                    outputOrder.push(groupKey);
                }
            } else if (!isNaN(parseInt(groupKey))) { // Older years
                 outputOrder.push(groupKey); // Simple push, will be sorted later
            } else if (!outputOrder.includes(groupKey)){ // For fixed keys like 7/30 days
                 outputOrder.push(groupKey);
            }
        }
      }
      groups[groupKey].push(session);
    }
  });

  // Sort sessions within each group by the chosen timestamp (lastMessageTimestamp prioritized, then createdAt) descending
  for (const key in groups) {
    groups[key].sort((a, b) => {
      const dateA = new Date(a.lastMessageTimestamp || a.createdAt); // MODIFIED LINE
      const dateB = new Date(b.lastMessageTimestamp || b.createdAt); // MODIFIED LINE
      return dateB.getTime() - dateA.getTime();
    });
  }
  
  // Define the desired order of fixed groups
  const fixedOrder = [groupTitles.previous7Days, groupTitles.previous30Days];
  
  // Extract dynamic groups (months of previous year and older years)
  const dynamicGroups = Object.keys(groups)
    .filter(key => !fixedOrder.includes(key))
    .sort((a, b) => {
      // Check if 'a' and 'b' are year strings (e.g., "2023")
      const isAYear = /^\d{4}$/.test(a);
      const isBYear = /^\d{4}$/.test(b);

      // Check if 'a' and 'b' are "Month YYYY" strings
      const isAMonthYear = /^[A-Za-z]+ \d{4}$/.test(a);
      const isBMonthYear = /^[A-Za-z]+ \d{4}$/.test(b);

      if (isAMonthYear && isBMonthYear) {
        // Both are "Month YYYY", sort by date descending
        const dateA = new Date(a); // e.g., "December 2024" -> Date object
        const dateB = new Date(b);
        return dateB.getTime() - dateA.getTime();
      } else if (isAYear && isBYear) {
        // Both are "YYYY", sort numerically descending
        return parseInt(b) - parseInt(a);
      } else if (isAMonthYear && isBYear) {
        // MonthYear comes before Year if month's year is greater or equal
        const yearA = parseInt(a.split(' ')[1]);
        const yearB = parseInt(b);
        return yearB - yearA  // This effectively sorts YearB before MonthYearA if YearB > YearA
      } else if (isAYear && isBMonthYear) {
        const yearA = parseInt(a);
        const yearB = parseInt(b.split(' ')[1]);
        return yearB - yearA; // This effectively sorts MonthYearB before YearA if YearB > YearA
      }
      // Fallback or if one is month-year and other is year, needs careful thought
      // For now, this should handle distinct categories okay.
      // If a is a month-year (e.g. "Dec 2024") and b is a year (e.g. "2023"), "Dec 2024" should come first.
      if (isAMonthYear && isBYear) return -1; // MonthYear before Year
      if (isAYear && isBMonthYear) return 1;  // Year after MonthYear

      return 0; // Should not happen if logic is correct
    });

  const finalOutputOrder = [...fixedOrder, ...dynamicGroups];

  const result = finalOutputOrder
    .filter(key => groups[key] && groups[key].length > 0) // Only include keys that have sessions
    .map(key => ({
      title: key,
      sessions: groups[key]
    }));

  console.log('Final grouped result:', result.map(group => ({
    title: group.title,
    sessionCount: group.sessions.length,
    sessions: group.sessions.map(s => ({ 
      id: s._id, 
      title: s.title, 
      lastMessageTimestamp: s.lastMessageTimestamp, 
      lastAccessedAt: s.lastAccessedAt,
      createdAt: s.createdAt // Log createdAt for better debugging of fallback
    }))
  })));

  console.log('=== END GROUPING SESSIONS DEBUG ===');

  return result;
};


const ChatPage: React.FC<ChatPageProps> = ({ isSidebarVisible, toggleSidebarVisibility }: ChatPageProps): JSX.Element => { // Explicit return type
  // Get state and actions from the global store
  const {
    isDarkMode,
    sessions, // Use global sessions
    sessionsLoading, // Use global loading state
    sessionsError, // Use global error state
    fetchSessions, // Use global fetch action
    deleteSession, // Use global delete action
    setSessions, // Use global setter action
    startNewChat, // Get startNewChat action from the store
  } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null); // Keep local state for the *selected* session
  const [newMessage, setNewMessage] = useState('');
  // Removed local loadingSessions state
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState(''); // Keep local error for component-specific errors (e.g., message send)
  const [sendingMessage, setSendingMessage] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null); // Keep local delete loading indicator for UI feedback
  const [groupedSessions, setGroupedSessions] = useState<DateGroup[]>([]); // State for grouped sessions
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
   // Update state to use the new combined interface and initialize appropriately
   const [availableModels, setAvailableModels] = useState<CombinedAvailableModels>({ baseModels: {}, customModels: [] });
   const [selectedModel, setSelectedModel] = useState<string>(''); // This will hold either base model name or custom model ID
   const [loadingModels, setLoadingModels] = useState(true);
   // Removed local isSidebarVisible state
   // State for streaming response
   const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
   const [streamingMessageContent, setStreamingMessageContent] = useState<string>('');
  const [reasoningSteps, setReasoningSteps] = useState<{ [messageId: string]: string }>({}); // State for reasoning steps (store as string)
  const [showReasoning, setShowReasoning] = useState(true); // State for showing/hiding reasoning AND enabling streaming
  // const [isStreamingEnabled, setIsStreamingEnabled] = useState(true); // REMOVED - Merged with showReasoning
  const { t, i18n } = useTranslation(); // Import i18n instance
  const navigate = useNavigate();
  const { sessionId: routeSessionId } = useParams<{ sessionId?: string }>();
   const abortControllerRef = useRef<AbortController | null>(null); // Restore AbortController ref
    const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for the end of the messages list
    const textareaRef = useRef<HTMLTextAreaElement>(null); // Ref for textarea
    const [isListening, setIsListening] = useState(false); // State for speech recognition
  const recognitionRef = useRef<SpeechRecognition | null>(null); // Ref to hold recognition instance
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // For image previews
  const [isSessionMemoryActive, setIsSessionMemoryActive] = useState(true); // State for session memory toggle
  // const [isTextareaElevated, setIsTextareaElevated] = useState(false); // No longer needed, textarea is always "elevated"

    // --- Helper Function for Parsing Perplexity Content ---
  const parsePerplexityContent = (content: string): { reasoning: string | null; mainContent: string } => {
      const reasoningMatch = content.match(/<think>([\s\S]*?)<\/think>/);
      if (reasoningMatch && reasoningMatch[1]) {
          const reasoning = reasoningMatch[1].trim();
          const mainContent = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
          return { reasoning, mainContent };
      }
      return { reasoning: null, mainContent: content };
  };

  // --- Fetch Functions ---
  // Removed local fetchSessions function - will use global store's fetchSessions
  // Update fetchAvailableModels to handle the new combined structure
  const fetchAvailableModels = async () => {
      setLoadingModels(true);
      try {
          const response = await apiClient.get('/providers/models'); // Endpoint now returns combined data
          if (response.data?.success) {
              // Ensure the data structure matches CombinedAvailableModels
              const data = response.data.data;
              // Perform more robust checking
              if (data &&
                  typeof data.baseModels === 'object' &&
                  data.baseModels !== null && // Check not null
                  !Array.isArray(data.baseModels) && // Check not an array
                  Array.isArray(data.customModels))
              {
                   // Validate customModels structure minimally
                   const isValidCustomModels = data.customModels.every((item: any) =>
                       typeof item === 'object' && item !== null && '_id' in item && 'name' in item && 'providerName' in item && 'baseModelIdentifier' in item && 'baseModelSupportsVision' in item
                   );

                   if (isValidCustomModels) {
                       setAvailableModels(data as CombinedAvailableModels);
                       console.log("Successfully fetched and set combined models:", data);
                   } else {
                       console.error("Fetched custom models data structure is incorrect:", data.customModels);
                       setAvailableModels({ baseModels: data.baseModels, customModels: [] }); // Keep base models if custom are bad
                   }
              } else {
                  console.error("Fetched available models data structure is incorrect:", data);
                  setAvailableModels({ baseModels: {}, customModels: [] }); // Set to default empty state
              }
          } else {
              console.error("Failed to fetch available models (API error):", response.data?.error);
              setAvailableModels({ baseModels: {}, customModels: [] }); // Set to default empty state on failure
          }
      } catch (err: any) {
          console.error("Error fetching available models (Network/Server error):", err);
          setAvailableModels({ baseModels: {}, customModels: [] }); // Set to default empty state on error
          if (err.response?.status === 401) navigate('/login');
      } finally {
          setLoadingModels(false);
      }
  };
  // Removed local handleDeleteSession - will use global store's deleteSession
  const handleToggleShare = async () => {
      if (!currentSession) return;
      setShareLoading(true);
      setError('');
      const newShareStatus = !currentSession.isShared;
      try {
          const response = await apiClient.put(`/chatsessions/${currentSession._id}`, { isShared: newShareStatus });
          if (response.data?.success) {
              const updatedSession: ChatSession = response.data.data; // Ensure type
              setCurrentSession(updatedSession);
              // Use the setter correctly: provide the new array
              setSessions(sessions.map((s: ChatSession): ChatSession => s._id === updatedSession._id ? updatedSession : s));
          } else {
              setError('Failed to update sharing status.');
          }
      } catch (err: any) {
          setError(err.response?.data?.error || 'Error updating sharing status.');
          if (err.response?.status === 401) navigate('/login');
      } finally {
          setShareLoading(false);
      }
  };
  const fetchMessages = async (sessionId: string) => {
      if (!sessionId) return;
      setLoadingMessages(true);
      setError('');
      setMessages([]);
      setReasoningSteps({}); // Clear old reasoning steps when fetching new messages
      try {
          const response = await apiClient.get(`/chatsessions/${sessionId}/messages`);
          if (response.data?.success) {
              const fetchedMessages: ChatMessage[] = response.data.data;
              setMessages(fetchedMessages);

              // Populate reasoningSteps state from fetched messages (ensure it's string)
              // No need to populate reasoningSteps here anymore, as it's handled during SSE or stored in msg.reasoningContent

              const lastAiMessage = [...fetchedMessages].reverse().find(m => m.sender === 'ai' && m.modelUsed);
              setSelectedModel(lastAiMessage?.modelUsed || '');
              // After fetching messages, the session's lastAccessedAt was updated on backend.
              // Re-fetch all sessions to get the latest lastAccessedAt for correct grouping.
              fetchSessions(); 
          } else {
              setError('Failed to load messages for this session.');
          }
      } catch (err: any) {
          setError(err.response?.data?.error || 'Error loading messages.');
          if (err.response?.status === 401) navigate('/login');
      } finally {
          setLoadingMessages(false);
      }
  };
   const handleSelectSession = (session: ChatSession) => {
       setCurrentSession(session);
       navigate(`/chat/${session._id}`);
       fetchMessages(session._id); // This will now also trigger fetchSessions() on success
       // Close sidebar if it's currently visible
       if (isSidebarVisible) {
           toggleSidebarVisibility();
       }
   };
   // Removed local handleNewChat function - Navbar icon uses global store action now

   // Handle keydown for textarea (Shift+Enter to send, Enter for newline)
   const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
       if (e.key === 'Enter' && e.shiftKey) { // Check for Shift+Enter
           e.preventDefault(); // Prevent default newline from Shift+Enter if any
           handleSendMessage(); // Send the message
       }
       // If only Enter is pressed (without Shift), do nothing here,
       // allowing the default newline behavior of the textarea.
   };

    // Handle pasting images
    const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = event.clipboardData?.items;
        if (items) {
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        setSelectedFile(blob);
                        // Create a preview URL for the pasted image
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            setPreviewUrl(reader.result as string);
                        };
                        reader.readAsDataURL(blob);
                    }
                    event.preventDefault(); // Prevent pasting as text
                    break;
                }
            }
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files ? event.target.files[0] : null;
        setSelectedFile(file);
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setPreviewUrl(null); // Clear preview if not an image or no file
        }
    };

    const clearSelectedFile = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset file input
        }
    };

   // Combined Send Message Logic
   const handleSendMessage = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if ((!newMessage.trim() && !selectedFile) || !currentSession?._id || sendingMessage) return;

      const sessionId = currentSession._id;
      setSendingMessage(true);
      setError('');
      setStreamingMessageId(null); // Reset streaming state
      setStreamingMessageContent('');

      const userMessageContent = newMessage;
      const fileToSend = selectedFile;
      setNewMessage('');
      setSelectedFile(null);
      setPreviewUrl(null); // Clear preview after sending
      if (fileInputRef.current) fileInputRef.current.value = '';

      const formData = new FormData();
      formData.append('content', userMessageContent);
      if (fileToSend) formData.append('file', fileToSend);
      if (selectedModel) formData.append('model', selectedModel);

      // Optimistic user message
      const optimisticUserMessage: ChatMessage = {
          _id: `temp-user-${Date.now()}`,
          sender: 'user',
          content: userMessageContent + (fileToSend ? `\n\n[Uploading: ${fileToSend.name}]` : ''),
          timestamp: new Date().toISOString()
      };
      // Store the temp ID to find and replace later
      const optimisticUserMessageId = optimisticUserMessage._id;
      setMessages((prev: ChatMessage[]) => [...prev, optimisticUserMessage]); // Add user message optimistically

      // --- Conditional Logic: Stream if showReasoning is true ---
      if (showReasoning) { // Use showReasoning to control streaming
          // --- Streaming Logic ---
          console.log("Streaming enabled via reasoning toggle."); // Add log
          formData.append('useSessionMemory', isSessionMemoryActive.toString()); // Add session memory flag
          const optimisticAiMessageId = `temp-ai-${Date.now()}`;
          const optimisticAiMessage: ChatMessage = {
              _id: optimisticAiMessageId,
              sender: 'ai',
              content: '', // Start empty
              timestamp: new Date().toISOString(),
              modelUsed: '...' // Placeholder
          };
          setMessages((prev: ChatMessage[]) => [...prev, optimisticAiMessage]); // Add AI placeholder AFTER user message
          setStreamingMessageId(optimisticAiMessageId);

          abortControllerRef.current = new AbortController();
          const { signal } = abortControllerRef.current;

          try {
              // Add stream=true parameter for streaming requests
              formData.append('stream', 'true');

              // Get the base URL from the same source as apiClient
              const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
              // Use the full URL for fetch in production, or relative URL in development
              const fetchUrl = apiBaseUrl
                  ? `${apiBaseUrl}/chatsessions/${sessionId}/messages` // Production: full URL without duplicate /api/v1
                  : `/api/v1/chatsessions/${sessionId}/messages`;      // Development: relative URL with /api/v1

              console.log('Streaming fetch URL:', fetchUrl);
              const response = await fetch(fetchUrl, {
                  method: 'POST',
                  body: formData,
                  headers: {
                      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                      // No Content-Type needed for fetch with FormData
                  },
                  signal: signal
              });

              if (!response.ok) {
                  let errorMsg = `HTTP error! status: ${response.status}`;
                  try { const errorData = await response.json(); errorMsg = errorData?.error || JSON.stringify(errorData); } catch (parseError) { console.error("Failed to parse error response as JSON:", parseError); try { const errorText = await response.text(); console.error("Raw error response text:", errorText); errorMsg = `Failed to parse error response (status: ${response.status}). Raw text: ${errorText.substring(0, 100)}...`; } catch (textError) { console.error("Failed to get raw error text:", textError); errorMsg = `HTTP error! status: ${response.status} (Could not parse error response)`; } }
                  throw new Error(errorMsg);
              }
              if (!response.body) throw new Error('Response body is null.');

              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let buffer = '';
              let finalContent = '';
              let accumulatedReasoning = ''; // Local accumulator for reasoning during stream

              while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split('\n');
                  buffer = lines.pop() || '';
                  for (const line of lines) {
                      if (line.startsWith('data: ')) {
                          try {
                              const jsonData = JSON.parse(line.substring(6));
                              if (jsonData.type === 'chunk') {
                                  setStreamingMessageContent((prev: string) => prev + jsonData.content);
                                  finalContent += jsonData.content;
                              } else if (jsonData.type === 'model_info') {
                                  setMessages((prev: ChatMessage[]) => prev.map((msg: ChatMessage) => msg._id === optimisticAiMessageId ? { ...msg, modelUsed: jsonData.modelUsed || 'unknown' } : msg));
                              } else if (jsonData.type === 'citations') {
                                  console.log('Received citations in streaming mode:', jsonData.citations);
                                  if (jsonData.citations && jsonData.citations.length > 0) {
                                      console.log(`Citations count: ${jsonData.citations.length}`);
                                      // Store citations in the message
                                      setMessages((prev: ChatMessage[]) => {
                                          // Deep clone the citations to ensure we're not sharing references
                                          const citationsCopy = JSON.parse(JSON.stringify(jsonData.citations));
                                          console.log('Citations copy:', citationsCopy);

                                          const updatedMessages = prev.map((msg: ChatMessage) =>
                                              msg._id === optimisticAiMessageId
                                                  ? {
                                                      ...msg,
                                                      citations: citationsCopy
                                                    }
                                                  : msg
                                          );

                                          // Log the updated message to verify citations were added
                                          const updatedMsg = updatedMessages.find((m: ChatMessage) => m._id === optimisticAiMessageId);
                                          console.log('Updated message with citations:', {
                                              id: updatedMsg?._id,
                                              hasCitations: !!updatedMsg?.citations,
                                              citationsCount: updatedMsg?.citations?.length || 0,
                                              citations: updatedMsg?.citations
                                          });

                                          // Debug: Log all messages to see if citations are being stored
                                          console.log('All messages after citation update:',
                                              updatedMessages.map((m: ChatMessage) => ({
                                                  id: m._id,
                                                  sender: m.sender,
                                                  hasCitations: !!m.citations,
                                                  citationsCount: m.citations?.length || 0
                                              }))
                                          ); // Corrected: Added closing parenthesis for console.log

                                          return updatedMessages;
                                      });
                                  } else {
                                      console.warn('Received empty citations array in streaming mode');
                                  }
                              } else if (jsonData.type === 'reasoning_chunk') { // Handle reasoning chunks
                                  console.log('Received reasoning chunk:', jsonData.content);
                                  // Accumulate reasoning content as a string locally
                                  accumulatedReasoning += jsonData.content;
                                  // Update the temporary state for immediate display
                                  setReasoningSteps((prev: { [messageId: string]: string }) => ({
                                      ...prev,
                                      [optimisticAiMessageId]: accumulatedReasoning
                                  }));
                              } else if (jsonData.type === 'title_update' && currentSession) {
                                  // Assuming backend sends the full updated session object in jsonData.updatedSession
                                  if (jsonData.updatedSession) {
                                    const updatedSessionFromServer = jsonData.updatedSession as ChatSession;
                                    setCurrentSession(updatedSessionFromServer);
                                    setSessions(sessions.map((s: ChatSession): ChatSession => s._id === updatedSessionFromServer._id ? updatedSessionFromServer : s ));
                                  } else if (jsonData.title && currentSession) { // Fallback to title only if full session not sent
                                    setCurrentSession((prev: ChatSession | null) => prev ? { ...prev, title: jsonData.title } : null);
                                    setSessions(sessions.map((s: ChatSession): ChatSession => s._id === currentSession._id ? { ...s, title: jsonData.title } : s ));
                                  }
                              } else if (jsonData.type === 'error') {
                                  setError(`AI Error: ${jsonData.message}`); console.error('SSE Error Event:', jsonData.message); setStreamingMessageId(null); 
                                  setMessages((prev: ChatMessage[]) => prev.map((msg: ChatMessage) => msg._id === optimisticAiMessageId ? { ...msg, content: `[Error: ${jsonData.message}]`, modelUsed: 'error' } : msg)); 
                                  reader.cancel(); return; // Added return here
                              } else if (jsonData.type === 'done') {
                                  console.log('Stream finished.');
                                  // Get accumulated reasoning for this message from the local variable
                                  const finalReasoning = accumulatedReasoning || null;
                                  setMessages((prev: ChatMessage[]) => {
                                      // Find the current message to preserve its citations
                                      const currentMsg = prev.find((m: ChatMessage) => m._id === optimisticAiMessageId);
                                      const currentCitations = currentMsg?.citations;

                                      console.log('Updating message at stream end:', {
                                          messageId: optimisticAiMessageId,
                                          hasCitations: !!currentCitations,
                                          citationsCount: currentCitations?.length || 0
                                      });

                                      return prev.map((msg: ChatMessage) =>
                                          msg._id === optimisticAiMessageId
                                              ? {
                                                  ...msg,
                                                  content: finalContent,
                                                  reasoningContent: finalReasoning,
                                                  // Explicitly preserve citations
                                                  citations: currentCitations
                                                }
                                              : msg
                                      );
                                  });
                                  setStreamingMessageId(null);
                                  setStreamingMessageContent('');
                                  // Clean up reasoningSteps state for the temp ID
                                  setReasoningSteps((prev: { [messageId: string]: string }) => {
                                      const newState = {...prev};
                                      delete newState[optimisticAiMessageId];
                                      return newState;
                                  });
                                  return;
                              } else if (jsonData.type === 'user_message_saved') { // Handle the saved user message
                                  const savedUserMsg = jsonData.message as ChatMessage;
                                  console.log("Received saved user message:", savedUserMsg);
                                  // Replace the optimistic message with the confirmed one from backend
                                  setMessages((prev: ChatMessage[]) => prev.map((msg: ChatMessage) =>
                                      msg._id === optimisticUserMessageId ? savedUserMsg : msg
                                  ));
                              } else if (jsonData.type === 'done' && jsonData.updatedSession) { // Handle 'done' event with session update
                                  console.log('Stream finished with done event, updating session.');
                                  const updatedSessionFromServer = jsonData.updatedSession as ChatSession;
                                  setCurrentSession(updatedSessionFromServer); // Update local currentSession
                                  
                                  // Correctly update global sessions list using the store's current sessions
                                  const currentGlobalSessions = useAuthStore.getState().sessions;
                                  const newGlobalSessions = currentGlobalSessions.map((s: ChatSession) => 
                                    s._id === updatedSessionFromServer._id ? updatedSessionFromServer : s
                                  );
                                  setSessions(newGlobalSessions); 
                                  
                                  // The rest of the 'done' logic (clearing streaming state) is handled by the existing 'done' block below
                              }
                          } catch (e: any) { console.error('Failed to parse SSE data:', e, 'Line:', line); }
                      }
                  }
              }
              // Handle stream ending without 'done' event (might happen on error/abort)
              console.log('Stream ended without done event.');
              const finalReasoningOnEnd = accumulatedReasoning || null;
              setMessages((prev: ChatMessage[]) => {
                  // Find the current message to preserve its citations
                  const currentMsg = prev.find((m: ChatMessage) => m._id === optimisticAiMessageId);
                  const currentCitations = currentMsg?.citations;

                  console.log('Updating message at stream end (no done event):', {
                      messageId: optimisticAiMessageId,
                      hasCitations: !!currentCitations,
                      citationsCount: currentCitations?.length || 0
                  });

                  return prev.map((msg: ChatMessage) =>
                      msg._id === optimisticAiMessageId
                          ? {
                              ...msg,
                              content: finalContent,
                              reasoningContent: finalReasoningOnEnd,
                              // Explicitly preserve citations
                              citations: currentCitations
                            }
                          : msg
                  );
              });
              setStreamingMessageId(null);
              setStreamingMessageContent('');
              setReasoningSteps((prev: { [key: string]: string }) => {
                  const newState = {...prev};
                  delete newState[optimisticAiMessageId];
                  return newState;
              });


          } catch (err: any) {
              if (err.name === 'AbortError') { console.log('Fetch aborted'); setError('Message sending cancelled.'); } else { console.error('Fetch error:', err); setError(err.message || 'Error sending message or processing stream.'); }
              // Remove only the AI placeholder on error, keep the user message
              setMessages((prev: ChatMessage[]) => prev.filter((m: ChatMessage) => m._id !== optimisticAiMessageId)); // This should return the filtered array
              setStreamingMessageId(null); setStreamingMessageContent(''); if (err.response?.status === 401) navigate('/login');
          } finally {
              // Ensure sendingMessage is set to false even if streaming continues in background
              setSendingMessage(false);
              // Don't clear abortControllerRef here if you want to allow cancellation during streaming
              // abortControllerRef.current = null;
          }

      } else {
          // --- Non-Streaming Logic ---
          // Add AI placeholder for non-streaming as well, to show loading
          const optimisticAiMessageId = `temp-ai-${Date.now()}`;
          const optimisticAiMessage: ChatMessage = {
              _id: optimisticAiMessageId,
              sender: 'ai',
              content: '...', // Loading indicator
              timestamp: new Date().toISOString(),
              modelUsed: '...'
          };
          setMessages((prev: ChatMessage[]) => [...prev, optimisticAiMessage]); // Add AI placeholder

          try {
              // Use apiClient.post (expects single JSON response with AI message)
              // Add stream=false parameter for non-streaming requests
              formData.append('stream', 'false');
              formData.append('useSessionMemory', isSessionMemoryActive.toString()); // Add session memory flag

              const response = await apiClient.post(`/chatsessions/${sessionId}/messages`, formData, {
                  headers: {
                      // Axios handles FormData Content-Type automatically
                      'Content-Type': 'multipart/form-data',
                  }
              });

              if (response.data?.success) {
                  const aiMessageResponse = response.data.data; // AI response
                  const savedUserMsg = response.data.userMessage; // Saved user message
                  const updatedSessionData = response.data.updatedSession as ChatSession; // Expect full session

                  // Replace optimistic user message and AI placeholder
                  setMessages((prev: ChatMessage[]) => prev.map((msg: ChatMessage) => {
                      if (msg._id === optimisticUserMessageId) return savedUserMsg; // Replace user msg
                      if (msg._id === optimisticAiMessageId) return aiMessageResponse; // Replace AI placeholder
                      return msg;
                  }));

                  if (aiMessageResponse.modelUsed) setSelectedModel(aiMessageResponse.modelUsed);
                  
                  if (updatedSessionData && currentSession) {
                      setCurrentSession(updatedSessionData);
                      setSessions(
                        sessions.map((s: ChatSession): ChatSession =>
                          s._id === updatedSessionData._id ? updatedSessionData : s
                        )
                      );
                  } else if (response.data.updatedSessionTitle && currentSession) { // Fallback if only title is sent
                      const newTitle = response.data.updatedSessionTitle;
                      setCurrentSession((prev: ChatSession | null) => prev ? { ...prev, title: newTitle, lastAccessedAt: new Date().toISOString() } : null); // Optimistically update lastAccessedAt
                      setSessions(
                        sessions.map((s: ChatSession): ChatSession =>
                          s._id === currentSession._id ? { ...s, title: newTitle, lastAccessedAt: new Date().toISOString() } : s // Optimistically update lastAccessedAt
                        )
                      );
                  }
              } else {
                  setError(response.data?.error || 'Failed to send message or get AI response.');
                  // Remove AI placeholder on failure
                  setMessages((prev: ChatMessage[]) => prev.filter((m: ChatMessage) => m._id !== optimisticAiMessageId));
              }
          } catch (err: any) {
              console.error("Send Message Error (apiClient):", err);
              setError(err.response?.data?.error || 'Error sending message.');
              // Remove AI placeholder on failure
              setMessages((prev: ChatMessage[]) => prev.filter((m: ChatMessage) => m._id !== optimisticAiMessageId));
              if (err.response?.status === 401) navigate('/login');
          } finally {
              setSendingMessage(false);
          }
      }
  };

  // --- Effects ---
  useEffect(() => {
    // Fetch initial data using global store action
    const fetchInitialData = async () => {
        await fetchAvailableModels(); // Fetch models first
        await fetchSessions(); // Use global fetch action
    };
     fetchInitialData();

     // --- Speech Recognition Setup ---
     // Check for browser support and initialize
     const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
     if (SpeechRecognition) {
         recognitionRef.current = new SpeechRecognition();
         recognitionRef.current.continuous = false; // Process speech after user stops talking
         recognitionRef.current.lang = 'en-US'; // Set language (adjust if needed)
         recognitionRef.current.interimResults = false; // We only want final results

         recognitionRef.current.onstart = () => {
             console.log('Speech recognition started');
             setIsListening(true);
         };

         recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
             const transcript = event.results[event.results.length - 1][0].transcript.trim();
             console.log('Speech recognized:', transcript);
             setNewMessage((prev: string) => prev ? prev + ' ' + transcript : transcript); // Append transcript
         };

         recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
             console.error('Speech recognition error:', event.error);
             // Handle specific errors like 'not-allowed' or 'no-speech' if needed
             setIsListening(false); // Ensure listening state is reset on error
         };

         recognitionRef.current.onend = () => {
             console.log('Speech recognition ended');
             setIsListening(false);
         };
     } else {
         console.warn('Speech Recognition API not supported in this browser.');
     }
     // --- End Speech Recognition Setup ---

   }, [fetchSessions]); // Depend on fetchSessions from store

   // Effect to update speech recognition language when app language changes
   useEffect(() => {
       if (recognitionRef.current) {
           const currentLang = i18n.language;
           const recognitionLang = currentLang === 'vi' ? 'vi-VN' : 'en-US';
           console.log(`Setting speech recognition language to: ${recognitionLang} based on app language: ${currentLang}`);
           recognitionRef.current.lang = recognitionLang;
       }
   }, [i18n.language]); // Re-run when language changes

   // --- Speech Recognition Toggle Function ---
   const handleToggleListening = () => {
       if (!recognitionRef.current) {
           alert('Speech Recognition is not supported by your browser.');
           return;
       }

       if (isListening) {
           recognitionRef.current.stop();
       } else {
           try {
               recognitionRef.current.start();
           } catch (err) {
               // Handle potential errors if start() is called while already active (though onend should prevent this)
               console.error("Error starting speech recognition:", err);
               setIsListening(false); // Reset state if start fails
           }
       }
   };
   // --- End Speech Recognition Toggle Function ---


   // Effect to handle selecting session based on URL or loading the latest
  useEffect(() => {
    // Don't run if sessions haven't loaded yet from the store
    if (sessionsLoading) return;

    if (routeSessionId) {
        // If there's a session ID in the URL, try to load it
        if (routeSessionId !== currentSession?._id) {
            const sessionFromRoute = sessions.find((s: ChatSession) => s._id === routeSessionId);
            if (sessionFromRoute) {
                console.log("Loading session from URL:", routeSessionId);
                setCurrentSession(sessionFromRoute);
                fetchMessages(sessionFromRoute._id);
            } else {
                console.warn(`Session ID ${routeSessionId} from URL not found in fetched sessions.`);
                // Optional: Navigate to base chat page or show error?
                // navigate('/chat');
            }
        }
    } else if (!currentSession && sessions.length > 0) {
        // If no session ID in URL and no session currently selected, load the most recent one
        const mostRecentSession = sessions[0]; // Assuming the first one is the most recent (sorted by lastAccessedAt)
        console.log("No session in URL, loading most recent by lastAccessedAt:", mostRecentSession._id);
        handleSelectSession(mostRecentSession); // This will navigate and fetch messages
    }

    // Group sessions when sessions data changes
    if (sessions.length > 0) {
      const now = new Date(); // Use current time for grouping
      setGroupedSessions(groupSessionsByDate(sessions, now));
    } else {
      setGroupedSessions([]); // Clear grouped sessions if no sessions
    }
  }, [routeSessionId, sessions, currentSession, sessionsLoading, navigate]); // Dependencies updated


  // Effect to scroll to bottom when messages change or loading finishes
  useEffect(() => {
    // Scroll to bottom smoothly after messages load or a new message is added
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingMessages]); // Trigger on message array change or when loading finishes

  // Effect for auto-expanding textarea
  useEffect(() => {
    if (textareaRef.current) {
        // Always reset height to auto first to allow the textarea to naturally size to its content
        textareaRef.current.style.height = 'auto';
        const scrollHeight = textareaRef.current.scrollHeight;

        // Now, set the actual height to this scrollHeight to show all content
        textareaRef.current.style.height = `${scrollHeight}px`;

        // isTextareaElevated logic removed as it's always "elevated" now
    }
  }, [newMessage]); // Trigger when newMessage changes

  // REMOVED: Effect to open sidebar when no chat is selected (Keep default collapsed)
  // useEffect(() => {
  //   if (!currentSession && !isSidebarVisible) {
  //     setIsSidebarVisible(true);
  //   }
   // }, [currentSession, isSidebarVisible]); // Keep comment or remove if no longer relevant

   // Removed local toggleSidebarVisibility function

   // --- Render ---
  return (
    <div className={styles.chatPageContainer} style={{ backgroundColor: isDarkMode ? '#1a1a1a' : '#f8f9fa' }}> {/* Apply container background */}
      {/* Sidebar */}
      <div
        className={`${styles.chatSidebar} ${isSidebarVisible ? styles.chatSidebarVisible : styles.chatSidebarHidden}`}
        style={{ backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff' }} // Apply opaque background directly
      >
         {isSidebarVisible && (
             <>
                 {/* Chat History Title and Close/New Chat Buttons */}
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                     <h4>{t('chat_history_title')}</h4>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <button
                            onClick={() => startNewChat(navigate)}
                            className={styles.sidebarHeaderCloseButton} // Re-use style for consistency
                            title={t('chat_new_button')}
                            aria-label={t('chat_new_button')}
                        >
                            <MdAddCircleOutline size="1.3em" />
                        </button>
                        <button
                            onClick={toggleSidebarVisibility}
                            className={styles.sidebarHeaderCloseButton} // Use new specific class
                            title={t('chat_sidebar_hide_tooltip')}
                            aria-label={t('chat_sidebar_hide_tooltip')}
                        >
                            <MdChevronLeft size="1.5em" /> {/* Replaced &laquo; with icon */}
                        </button>
                     </div>
                 </div>
                 {/* Use global sessionsLoading and sessionsError */}
                 {sessionsLoading ? <p>{t('chat_loading')}</p> : sessionsError ? <p style={{ color: 'red' }}>{sessionsError}</p> : groupedSessions.length > 0 ? (
                  <div style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {groupedSessions.map((group: DateGroup) => (
                      <div key={group.title} className={styles.sessionGroup}>
                        <h5 className={styles.sessionGroupTitle}>
                          {group.title === "date_group_previous_7_days" || group.title === "date_group_previous_30_days"
                            ? t(group.title)
                            : group.title}
                        </h5>
                        {group.sessions.length > 0 ? (
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {group.sessions.map((session: ChatSession) => (
                              <li key={session._id} className={`${styles.sessionListItem} ${currentSession?._id === session._id ? styles.sessionListItemActive : ''}`} title={session.title}>
                                <span onClick={() => handleSelectSession(session)} className={styles.sessionTitle}>
                                  {session.title || 'Untitled Chat'}
                                </span>
                                <button
                                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); deleteSession(session._id, currentSession?._id ?? null, navigate); }}
                                  disabled={deleteLoading === session._id}
                                  className={styles.deleteSessionButton}
                                  aria-label={t('chat_delete_session_tooltip', { title: session.title || 'Untitled Chat' })}
                                >
                                  {deleteLoading === session._id ? '...' : <MdClose size="0.9em" />}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className={styles.noSessionsInGroup}>{t('chat_no_sessions_in_group')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : <p>{t('chat_no_history')}</p>}
             </>
         )}
      </div>

       {/* Main Chat Area */}
       <div className={styles.mainChatArea}>
          {/* Removed floating hamburger button */}
          {/* Hamburger button removed from Navbar, will be added below - This comment seems misplaced now */}

          {currentSession ? (
           <>
             {/* Header */}
             <div style={{
                 display: 'flex',
                 justifyContent: 'space-between',
                 alignItems: 'center',
                 marginBottom: '15px',
                 paddingBottom: '15px',
                 borderBottom: `1px solid ${isDarkMode ? '#444' : '#dee2e6'}`,
                 marginLeft: '40px', // This might need adjustment if sidebar toggle is here
                 color: isDarkMode ? '#e0e0e0' : 'inherit',
                  gap: '10px' // Add gap between header items
              }}>
                  {/* Hamburger Button Removed From Here */}
                  <h3 style={{ color: isDarkMode ? '#e0e0e0' : 'inherit', flexGrow: 1, margin: 0 }}>{currentSession.title || 'Untitled Chat'}</h3> {/* Allow title to grow */}
                  {/* Ensure New Chat Button is removed from here */}
                  <button
                      onClick={handleToggleShare}
                      disabled={shareLoading}
                      className={`${styles.fileUploadButton} ${styles.reasoningToggle}`} // Use common icon button styles
                      title={currentSession.isShared ? t('chat_unshare_button') : t('chat_share_button')}
                      aria-label={currentSession.isShared ? t('chat_unshare_button') : t('chat_share_button')}
                  >
                      {shareLoading ? '...' : (currentSession.isShared ? <MdLinkOff /> : <MdShare />)}
                  </button>
             </div>
             {currentSession.isShared && currentSession.shareId && (
                <div style={{
                    marginBottom: '10px',
                    padding: '5px',
                    background: isDarkMode ? '#3a3d41' : '#f0f0f0',
                    color: isDarkMode ? '#e0e0e0' : 'inherit',
                    borderRadius: '4px',
                    marginLeft: '40px', // This might need adjustment
                    display: 'flex', // Use flexbox for alignment
                    alignItems: 'center', // Align items vertically
                    gap: '10px' // Add space between link and button
                }}>
                    <a href={`/share/${currentSession.shareId}`} target="_blank" rel="noopener noreferrer" style={{ color: isDarkMode ? '#64b5f6' : '#007bff' }}>
                        {t('chat_share_link')} {/* Display translated text as link */}
                    </a>
                    <CopyButton
                        textToCopy={`${window.location.origin}/share/${currentSession.shareId}`}
                    />
                </div>
             )}

             {/* Messages */}
             <div className={styles.messageList}> {/* Keep ref removed from here */}
               {loadingMessages ? <p>{t('chat_loading_messages')}</p> : messages.length > 0 ? (
                 messages.map((msg: ChatMessage) => (
                   <div key={msg._id} className={`${styles.messageRow} ${msg.sender === 'user' ? styles.messageRowUser : styles.messageRowAi}`}>

                        {/* --- AI MESSAGE --- */}
                        {msg.sender === 'ai' && (
                            <>
                                {/* --- Reasoning Section --- */}
                                {/* Render if showReasoning is true AND reasoning is available */}
                                {showReasoning && (msg.reasoningContent || reasoningSteps[msg._id] || (THINK_TAG_MODELS.includes(msg.modelUsed || '') && parsePerplexityContent(streamingMessageId === msg._id ? streamingMessageContent : msg.content).reasoning)) && (
                                    <details open={streamingMessageId === msg._id} style={{ marginBottom: '10px', marginLeft: '10px', marginRight: '10px', fontSize: '0.85em', opacity: 0.8 }}>
                                        <summary style={{ cursor: 'pointer', color: isDarkMode ? '#ccc' : '#555' }}>Reasoning Steps</summary>
                                        <pre style={{
                                            background: isDarkMode ? '#2a2a2a' : '#f0f0f0',
                                            padding: '8px',
                                            borderRadius: '4px',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-all',
                                            maxHeight: '200px', // Limit height
                                            overflowY: 'auto' // Allow scrolling
                                        }}>
                                            {/* Display reasoning: Check final msg.reasoningContent, then temp state, then parse <think> tags */}
                                            {msg.reasoningContent
                                                ? msg.reasoningContent
                                                : reasoningSteps[msg._id] // Check temp state during streaming
                                                    ? reasoningSteps[msg._id]
                                                    : THINK_TAG_MODELS.includes(msg.modelUsed || '') // Then check for <think> tags
                                                        ? parsePerplexityContent(streamingMessageId === msg._id ? streamingMessageContent : msg.content).reasoning
                                                        : null // No reasoning available/expected otherwise
                                            }
                                        </pre>
                                    </details>
                                )}

                                    {/* --- AI Bubble (Copy Button moved inside) --- */}
                                    {/* Removed outer flex wrapper */}
                                    <div
                                        className={`${styles.messageBubble}`}
                                        style={{
                                            background: isDarkMode ? '#3a3d41' : '#e9ecef', // AI Background
                                            color: isDarkMode ? '#e0e0e0' : '#343a40', // AI Text Color
                                        }}
                                    >
                                        {/* Copy Button moved inside */}
                                        <CopyButton
                                            textToCopy={streamingMessageId === msg._id ? streamingMessageContent : msg.content}
                                            className={styles.copyButtonInside} // Apply new class
                                        />
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                            code({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
                                                const match = /language-(\w+)/.exec(className || '');
                                                const baseTheme = isDarkMode ? okaidia : prism;
                                                const customSyntaxTheme = {
                                                    ...baseTheme,
                                                    'pre[class*="language-"]': {
                                                        ...(baseTheme['pre[class*="language-"]'] || {}),
                                                        background: 'transparent',
                                                        backgroundColor: 'transparent',
                                                    },
                                                    'code[class*="language-"]': {
                                                        ...(baseTheme['code[class*="language-"]'] || {}),
                                                        background: 'transparent',
                                                        backgroundColor: 'transparent',
                                                    }
                                                };
                                                return match ? (
                                                    <SyntaxHighlighter style={customSyntaxTheme as any} language={match[1]} useInlineStyles={true}>
                                                        {String(children).replace(/\n$/, '')}
                                                    </SyntaxHighlighter>
                                                ) : (
                                                    <code className={className} {...props}>{children}</code>
                                                );
                                            }
                                        }}
                                    >
                                        {/* Render parsed main content only for THINK_TAG_MODELS, otherwise full content */}
                                        {THINK_TAG_MODELS.includes(msg.modelUsed || '')
                                            ? parsePerplexityContent(streamingMessageId === msg._id ? streamingMessageContent : msg.content).mainContent
                                            : (streamingMessageId === msg._id ? streamingMessageContent : msg.content)
                                        }
                                        </ReactMarkdown>
                                        {/* Display file if present */}
                                        {msg.fileInfo && (
                                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${isDarkMode ? '#555' : '#ddd'}` }}>
                                                {msg.fileInfo.mimetype.startsWith('image/') ? (
                                                    <img
                                                        // Use fileInfo.path directly as it's now a full S3 URL
                                                        src={msg.fileInfo.path}
                                                        alt={msg.fileInfo.originalname}
                                                        style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px', marginTop: '5px' }}
                                                    />
                                                ) : (
                                                    <a
                                                        // Use fileInfo.path directly as it's now a full S3 URL
                                                        href={msg.fileInfo.path}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        download={msg.fileInfo.originalname}
                                                        className={styles.fileLink} // Add a class for styling if needed
                                                        style={{ color: isDarkMode ? '#8ab4f8' : '#007bff' }}
                                                    >
                                                        📄 {msg.fileInfo.originalname} ({(msg.fileInfo.size / 1024).toFixed(1)} KB)
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {/* End AI Bubble */}

                            {/* Add citations to the main bubble if available */}
                            {/* Force citations to be displayed regardless of streaming state */}
                            {(() => {
                                // Debug log for citations rendering
                                console.log(`Rendering message ${msg._id}:`, {
                                    hasCitations: !!msg.citations,
                                    citationsLength: msg.citations?.length || 0,
                                    isStreaming: streamingMessageId === msg._id,
                                    citations: msg.citations
                                });

                                // Check if citations exist and are not empty
                                if (msg.citations && msg.citations.length > 0) {
                                    console.log(`Rendering citations for message ${msg._id}`);
                                    return (
                                        <div style={{
                                            marginTop: '15px',
                                            borderTop: `1px solid ${isDarkMode ? '#444' : '#dee2e6'}`,
                                            paddingTop: '10px'
                                        }}>
                                    <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Sources:</div>
                                    {msg.citations.map((citation: any, index: number) => (
                                        <div key={index} style={{ marginBottom: '8px' }}>
                                            <a
                                                href={citation.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: isDarkMode ? '#64b5f6' : '#007bff', wordBreak: 'break-all' }}
                                            >
                                                {index + 1}. {citation.url}
                                            </a>
                                            {citation.snippet && (
                                                <div style={{ marginTop: '4px', fontStyle: 'italic', opacity: 0.8 }}>
                                                    "{citation.snippet}"
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                    );
                                }
                                return null;
                            })()}
                        </>
                    )}

                    {/* --- USER MESSAGE --- */}
                    {msg.sender === 'user' && (
                        <>
                            {/* User Bubble */}
                            <div
                                className={`${styles.messageBubble} ${styles.messageBubbleUser}`}
                                style={isDarkMode ? { backgroundColor: '#10402c' } : undefined}
                            >
                                {/* Copy Button moved inside */}
                                <CopyButton
                                    textToCopy={msg.content}
                                    className={styles.copyButtonInside} // Apply new class
                                />
                                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                                {/* Display file if present for user messages too */}
                                {msg.fileInfo && (
                                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${isDarkMode ? '#3a87fd' : '#3390ff'}` }}>
                                        {msg.fileInfo.mimetype.startsWith('image/') ? (
                                            <img
                                                // Use fileInfo.path directly as it's now a full S3 URL
                                                src={msg.fileInfo.path}
                                                alt={msg.fileInfo.originalname}
                                                style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px', marginTop: '5px' }}
                                            />
                                        ) : (
                                            <a
                                                // Use fileInfo.path directly as it's now a full S3 URL
                                                href={msg.fileInfo.path}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                download={msg.fileInfo.originalname}
                                                className={styles.fileLink}
                                                style={{ color: isDarkMode ? '#cce0ff' : '#e6f2ff' }} // Lighter color for user bubble
                                            >
                                                📄 {msg.fileInfo.originalname} ({(msg.fileInfo.size / 1024).toFixed(1)} KB)
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                            {/* User Button Removed from outside */}
                        </>
                    )}
                     </div>
                 ))
               ) : <p>{t('chat_start_message')}</p>}
                {error && <p style={{ color: 'red' }}>Error: {error}</p>}
                {/* Add empty div at the end for scrolling ref */}
                <div ref={messagesEndRef} />
             </div>

              {/* Input Area */}
              <form onSubmit={handleSendMessage} className={styles.inputForm}>
                 {/* Preview Area - Remains above the input bar */}
                 {previewUrl && selectedFile && selectedFile.type.startsWith('image/') && (
                    <div style={{ marginBottom: '10px', position: 'relative', maxWidth: '150px' }}>
                        <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '4px' }} />
                        <button onClick={clearSelectedFile} className={styles.clearPreviewButton} title="Remove image"><MdClose /></button>
                    </div>
                 )}
                 {selectedFile && !selectedFile.type.startsWith('image/') && (
                    <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span className={styles.fileNamePreview}>
                            <MdAttachFile style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {selectedFile.name}
                        </span>
                        <button onClick={clearSelectedFile} className={styles.clearPreviewButtonSmall} title="Remove file"><MdClose size="0.8em" /></button>
                    </div>
                 )}

                 {/* Input Controls Container - isTextareaElevated class removed */}
                 <div className={styles.inputControls}>
                    {/* Textarea is now always rendered first (visually above icons due to CSS flex-direction: column) */}
                    <textarea
                        ref={textareaRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('chat_input_placeholder')}
                        disabled={sendingMessage || loadingMessages || !currentSession}
                        className={styles.messageInput} // Use general messageInput style, .elevatedTextarea class might be merged or removed from CSS
                        onPaste={handlePaste}
                        rows={1} // Add rows={1}
                    />
                    {/* Icon Row */}
                    <div className={styles.iconRow}>
                        {/* Left Icon Group */}
                        <div className={styles.iconGroupLeft}>
                            {!loadingModels && (Object.keys(availableModels.baseModels).length > 0 || availableModels.customModels.length > 0) ? (
                                <ModelSelectorDropdown
                                    availableModels={availableModels}
                                    selectedModel={selectedModel}
                                    onModelChange={(newModel: string) => {
                                        setSelectedModel(newModel);
                                        // REASONING_MODELS check and setShowReasoning(true) removed as reasoning is always on
                                    }}
                                    disabled={sendingMessage || loadingMessages}
                                />
                            ) : null}

                            {!loadingModels && (Object.keys(availableModels.baseModels).length > 0 || availableModels.customModels.length > 0) && (
                                <button type="button" onClick={() => setIsSessionMemoryActive(!isSessionMemoryActive)} title={isSessionMemoryActive ? "Disable session memory" : "Enable session memory"} aria-label={isSessionMemoryActive ? "Disable session memory" : "Enable session memory"} aria-pressed={isSessionMemoryActive} className={styles.reasoningToggle} style={{ opacity: isSessionMemoryActive ? 1 : 0.6 }}>
                                    <MdAutoAwesome />
                                </button>
                            )}

                            {/* Reasoning toggle button removed */}
                        </div>

                        {/* Right Icon Group */}
                        <div className={styles.iconGroupRight}>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} id="file-upload" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" />
                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sendingMessage || loadingMessages || !currentSession} className={styles.fileUploadButton} title={selectedFile ? t('chat_attach_file_selected', { filename: selectedFile.name }) : t('chat_attach_file')} aria-label={selectedFile ? t('chat_attach_file_selected', { filename: selectedFile.name }) : t('chat_attach_file')}>
                                <MdAttachFile />
                            </button>

                            {recognitionRef.current && (
                                <button type="button" onClick={handleToggleListening} disabled={sendingMessage || loadingMessages || !currentSession} className={`${styles.micButton} ${isListening ? styles.micButtonListening : ''}`} title={isListening ? t('chat_stop_listening') : t('chat_start_listening')} aria-label={isListening ? t('chat_stop_listening') : t('chat_start_listening')}>
                                    {isListening ? <MdMicOff /> : <MdMic />}
                                </button>
                            )}

                            <button type="submit" disabled={sendingMessage || loadingMessages || (!newMessage.trim() && !selectedFile)} className={styles.sendButton} title={t('chat_send_button')} aria-label={t('chat_send_button')}>
                                <MdSend />
                            </button>
                        </div>
                    </div>
                 </div>
             </form>
           </>
         ) : (
             <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}> {/* Use flex column and center */}
                 <p>{t('chat_select_prompt')}</p>
                 {/* Removed local handleNewChat button */}
             </div>
         )}
       </div>
     </div>
   );
 };

export default ChatPage;
