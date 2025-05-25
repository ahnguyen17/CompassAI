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
    // Prioritize lastMessageTimestamp, then lastAccessedAt, then createdAt for grouping
    const dateToUse = session.lastMessageTimestamp || session.lastAccessedAt || session.createdAt;
    const sessionDate = new Date(dateToUse);
    sessionDate.setHours(0, 0, 0, 0); // Normalize session date to start of day for comparison

    console.log(`Session ${index + 1} (${session._id}):`, {
      title: session.title,
      lastMessageTimestamp: session.lastMessageTimestamp,
      lastAccessedAt: session.lastAccessedAt,
      createdAt: session.createdAt,
      dateToUse: dateToUse,
      sessionDate: sessionDate,
      isLastMessageTimestampUsed: !!session.lastMessageTimestamp
    });

    let groupKey: string | null = null;

    if (sessionDate >= sevenDaysAgo && sessionDate <= today) {
      groupKey = groupTitles.previous7Days;
    } else if (sessionDate >= thirtyDaysAgo && sessionDate < sevenDaysAgo) {
      groupKey = groupTitles.previous30Days;
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

  // Sort sessions within each group by the chosen timestamp (lastMessageTimestamp prioritized) descending
  for (const key in groups) {
    console.log(`Sorting sessions in group "${key}"`);
    groups[key].sort((a, b) => {
      const dateA = new Date(a.lastMessageTimestamp || a.lastAccessedAt || a.createdAt);
      const dateB = new Date(b.lastMessageTimestamp || b.lastAccessedAt || b.createdAt);
      console.log(`  Comparing: ${a.title} (${dateA}) vs ${b.title} (${dateB})`);
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
    sessions: group.sessions.map(s => ({ id: s._id, title: s.title, lastMessageTimestamp: s.lastMessageTimestamp, lastAccessedAt: s.lastAccessedAt }))
  })));
  console.log('=== END GROUPING DEBUG ===');

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
                                                  sender:
