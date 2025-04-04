import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// Import both light and dark themes
import { prism, okaidia } from 'react-syntax-highlighter/dist/esm/styles/prism';
import apiClient from '../services/api';
import CopyButton from '../components/CopyButton';
import { useTranslation } from 'react-i18next';
import styles from './ChatPage.module.css'; // Import CSS Module

// Interfaces
interface AvailableModels { [provider: string]: string[]; }
interface ChatSession { _id: string; title: string; createdAt: string; isShared?: boolean; shareId?: string; }
// Update ChatMessage interface to include optional reasoningContent
interface ChatMessage { 
    _id: string; 
    sender: 'user' | 'ai'; 
    content: string; 
    timestamp: string; 
    modelUsed?: string | null; 
    reasoningContent?: string | null; // Add optional reasoning content
    fileInfo?: { filename: string; originalname: string; mimetype: string; size: number; path: string; } 
}

// Define props for ChatPage
interface ChatPageProps {
    isDarkMode: boolean;
}

const ChatPage: React.FC<ChatPageProps> = ({ isDarkMode }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [availableModels, setAvailableModels] = useState<AvailableModels>({});
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [loadingModels, setLoadingModels] = useState(true);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false); // Default to hidden
  // State for streaming response
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingMessageContent, setStreamingMessageContent] = useState<string>('');
  const [reasoningSteps, setReasoningSteps] = useState<{ [messageId: string]: any[] }>({}); // State for reasoning steps
  const [showReasoning, setShowReasoning] = useState(false); // State for showing/hiding reasoning AND enabling streaming
  // const [isStreamingEnabled, setIsStreamingEnabled] = useState(true); // REMOVED - Merged with showReasoning
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sessionId: routeSessionId } = useParams<{ sessionId?: string }>();
  const abortControllerRef = useRef<AbortController | null>(null); // Restore AbortController ref
  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for the end of the messages list

  // --- Fetch Functions ---
  const fetchSessions = async () => { setLoadingSessions(true); setError(''); try { const response = await apiClient.get('/chatsessions'); if (response.data?.success) setSessions(response.data.data); else setError('Failed to load chat sessions.'); } catch (err: any) { setError(err.response?.data?.error || 'Error loading sessions.'); if (err.response?.status === 401) navigate('/login'); } finally { setLoadingSessions(false); } };
  const fetchAvailableModels = async () => { setLoadingModels(true); try { const response = await apiClient.get('/providers/models'); if (response.data?.success) setAvailableModels(response.data.data); else console.error("Failed to fetch available models"); } catch (err: any) { console.error("Error fetching available models:", err); if (err.response?.status === 401) navigate('/login'); } finally { setLoadingModels(false); } };
  const handleDeleteSession = async (sessionId: string, sessionTitle: string) => { if (!window.confirm(`Are you sure you want to delete the chat "${sessionTitle || 'Untitled Chat'}"?`)) return; setDeleteLoading(sessionId); setError(''); try { const response = await apiClient.delete(`/chatsessions/${sessionId}`); if (response.data?.success) { setSessions(prev => prev.filter(s => s._id !== sessionId)); if (currentSession?._id === sessionId) { setCurrentSession(null); setMessages([]); navigate('/'); } } else { setError('Failed to delete chat session.'); } } catch (err: any) { setError(err.response?.data?.error || 'Error deleting session.'); if (err.response?.status === 401) navigate('/login'); } finally { setDeleteLoading(null); } };
  const handleToggleShare = async () => { if (!currentSession) return; setShareLoading(true); setError(''); const newShareStatus = !currentSession.isShared; try { const response = await apiClient.put(`/chatsessions/${currentSession._id}`, { isShared: newShareStatus }); if (response.data?.success) { const updatedSession = response.data.data; setCurrentSession(updatedSession); setSessions(prev => prev.map(s => s._id === updatedSession._id ? updatedSession : s)); } else { setError('Failed to update sharing status.'); } } catch (err: any) { setError(err.response?.data?.error || 'Error updating sharing status.'); if (err.response?.status === 401) navigate('/login'); } finally { setShareLoading(false); } };
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
              
              // Populate reasoningSteps state from fetched messages
              const initialReasoningSteps: { [messageId: string]: any[] } = {};
              fetchedMessages.forEach(msg => {
                  if (msg.sender === 'ai' && msg.reasoningContent) {
                      // Assuming reasoningContent is stored as a string, 
                      // place it directly into the state for the corresponding message ID.
                      // If it were stored as JSON/Array, you might need JSON.parse here.
                      initialReasoningSteps[msg._id] = msg.reasoningContent as any; // Cast needed if type mismatch
                  }
              });
              setReasoningSteps(initialReasoningSteps);

              const lastAiMessage = [...fetchedMessages].reverse().find(m => m.sender === 'ai' && m.modelUsed); 
              setSelectedModel(lastAiMessage?.modelUsed || ''); 
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
  const handleSelectSession = (session: ChatSession) => { setCurrentSession(session); navigate(`/chat/${session._id}`); fetchMessages(session._id); };
  const handleNewChat = async () => { setError(''); try { const response = await apiClient.post('/chatsessions', { title: 'New Chat' }); if (response.data?.success) { const newSession: ChatSession = response.data.data; setSessions([newSession, ...sessions]); handleSelectSession(newSession); setSelectedModel(''); } else { setError('Failed to create new chat.'); } } catch (err: any) { setError(err.response?.data?.error || 'Error creating chat.'); if (err.response?.status === 401) navigate('/login'); } };

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
      setMessages(prev => [...prev, optimisticUserMessage]); // Add user message optimistically

      // --- Conditional Logic: Stream if showReasoning is true ---
      if (showReasoning) { // Use showReasoning to control streaming
          // --- Streaming Logic ---
          console.log("Streaming enabled via reasoning toggle."); // Add log
          const optimisticAiMessageId = `temp-ai-${Date.now()}`;
          const optimisticAiMessage: ChatMessage = {
              _id: optimisticAiMessageId,
              sender: 'ai',
              content: '', // Start empty
              timestamp: new Date().toISOString(),
              modelUsed: '...' // Placeholder
          };
          setMessages(prev => [...prev, optimisticAiMessage]); // Add AI placeholder AFTER user message
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
                                  setStreamingMessageContent(prev => prev + jsonData.content);
                                  finalContent += jsonData.content;
                              } else if (jsonData.type === 'model_info') {
                                  setMessages(prev => prev.map(msg => msg._id === optimisticAiMessageId ? { ...msg, modelUsed: jsonData.modelUsed || 'unknown' } : msg));
                              } else if (jsonData.type === 'reasoning_chunk') { // Handle reasoning chunks
                                  console.log('Received reasoning chunk:', jsonData.content);
                                  // Accumulate reasoning content as a string
                                  setReasoningSteps(prev => ({
                                      ...prev,
                                      [optimisticAiMessageId]: (prev[optimisticAiMessageId] || '') + jsonData.content 
                                  }));
                              } else if (jsonData.type === 'title_update' && currentSession) {
                                  setCurrentSession(prev => prev ? { ...prev, title: jsonData.title } : null);
                                  setSessions(prevSessions => prevSessions.map(s => s._id === currentSession._id ? { ...s, title: jsonData.title } : s ));
                              } else if (jsonData.type === 'error') {
                                  setError(`AI Error: ${jsonData.message}`); console.error('SSE Error Event:', jsonData.message); setStreamingMessageId(null); setMessages(prev => prev.map(msg => msg._id === optimisticAiMessageId ? { ...msg, content: `[Error: ${jsonData.message}]`, modelUsed: 'error' } : msg)); reader.cancel(); return;
                              } else if (jsonData.type === 'done') {
                                  console.log('Stream finished.'); setMessages(prev => prev.map(msg => msg._id === optimisticAiMessageId ? { ...msg, content: finalContent } : msg)); setStreamingMessageId(null); setStreamingMessageContent(''); return;
                              }
                          } catch (e) { console.error('Failed to parse SSE data:', e, 'Line:', line); }
                      }
                  }
              }
              console.log('Stream ended without done event.'); setMessages(prev => prev.map(msg => msg._id === optimisticAiMessageId ? { ...msg, content: finalContent } : msg)); setStreamingMessageId(null); setStreamingMessageContent('');

          } catch (err: any) {
              if (err.name === 'AbortError') { console.log('Fetch aborted'); setError('Message sending cancelled.'); } else { console.error('Fetch error:', err); setError(err.message || 'Error sending message or processing stream.'); }
              // Remove only the AI placeholder on error, keep the user message
              setMessages(prev => prev.filter(m => m._id !== optimisticAiMessageId));
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
          setMessages(prev => [...prev, optimisticAiMessage]); // Add AI placeholder

          try {
              // Use apiClient.post (expects single JSON response with AI message)
              // Add stream=false parameter for non-streaming requests
              formData.append('stream', 'false'); 

              const response = await apiClient.post(`/chatsessions/${sessionId}/messages`, formData, {
                  headers: {
                      // Axios handles FormData Content-Type automatically
                      'Content-Type': 'multipart/form-data',
                  }
              });

              if (response.data?.success) {
                  const aiMessage = response.data.data; // Expecting the AI message directly
                  // Replace AI placeholder with the actual message
                  setMessages(prev => prev.map(msg => msg._id === optimisticAiMessageId ? aiMessage : msg));
                  if (aiMessage.modelUsed) setSelectedModel(aiMessage.modelUsed);
                  if (response.data.updatedSessionTitle && currentSession) {
                      const newTitle = response.data.updatedSessionTitle;
                      setCurrentSession(prev => prev ? { ...prev, title: newTitle } : null);
                      setSessions(prevSessions => prevSessions.map(s => s._id === currentSession._id ? { ...s, title: newTitle } : s ));
                  }
              } else {
                  setError(response.data?.error || 'Failed to send message or get AI response.');
                  // Remove AI placeholder on failure
                  setMessages(prev => prev.filter(m => m._id !== optimisticAiMessageId));
              }
          } catch (err: any) {
              console.error("Send Message Error (apiClient):", err);
              setError(err.response?.data?.error || 'Error sending message.');
              // Remove AI placeholder on failure
              setMessages(prev => prev.filter(m => m._id !== optimisticAiMessageId));
              if (err.response?.status === 401) navigate('/login');
          } finally {
              setSendingMessage(false);
          }
      }
  };

  // --- Effects ---
  useEffect(() => {
    // Fetch initial data
    const fetchInitialData = async () => {
        await fetchAvailableModels(); // Fetch models first
        await fetchSessions(); // Then fetch sessions
    };
    fetchInitialData();
  }, []); // Run only once on mount

  // Effect to handle selecting session based on URL or loading the latest
  useEffect(() => {
    // Don't run if sessions haven't loaded yet
    if (loadingSessions) return;

    if (routeSessionId) {
        // If there's a session ID in the URL, try to load it
        if (routeSessionId !== currentSession?._id) {
            const sessionFromRoute = sessions.find(s => s._id === routeSessionId);
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
        // Assuming sessions are sorted by backend (or sort here if needed: [...sessions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
        const mostRecentSession = sessions[0]; // Assuming the first one is the most recent
        console.log("No session in URL, loading most recent:", mostRecentSession._id);
        handleSelectSession(mostRecentSession); // This will navigate and fetch messages
    }
  }, [routeSessionId, sessions, currentSession, loadingSessions, navigate]); // Dependencies

  // Effect to scroll to bottom when messages change or loading finishes
  useEffect(() => {
    // Scroll to bottom smoothly after messages load or a new message is added
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingMessages]); // Trigger on message array change or when loading finishes

  // Effect to open sidebar when no chat is selected
  useEffect(() => {
    if (!currentSession && !isSidebarVisible) {
      setIsSidebarVisible(true);
    }
  }, [currentSession, isSidebarVisible]);

  // --- Toggle Sidebar Visibility ---
  const toggleSidebarVisibility = () => setIsSidebarVisible(!isSidebarVisible);

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}> {/* Restore New Chat button */}
                    <button onClick={handleNewChat} className={styles.newChatButton}>{t('chat_new_button')}</button>
                    <button onClick={toggleSidebarVisibility} className={styles.sidebarToggleButton} title="Hide Sidebar" style={{ flexShrink: 0 }}>{'‹'}</button>
                </div>
                <h4>{t('chat_history_title')}</h4>
                {loadingSessions ? <p>{t('chat_loading')}</p> : error && !sessions.length ? <p style={{ color: 'red' }}>{error}</p> : sessions.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {sessions.map((session) => ( <li key={session._id} className={`${styles.sessionListItem} ${currentSession?._id === session._id ? styles.sessionListItemActive : ''}`} title={session.title}> <span onClick={() => handleSelectSession(session)} className={styles.sessionTitle}> {session.title || 'Untitled Chat'} </span> <button onClick={(e) => { e.stopPropagation(); handleDeleteSession(session._id, session.title); }} disabled={deleteLoading === session._id} className={styles.deleteSessionButton}> {deleteLoading === session._id ? '...' : '×'} </button> </li> ))}
                </ul> ) : <p>{t('chat_no_history')}</p>}
             </>
         )}
      </div>

      {/* Main Chat Area */}
      <div className={styles.mainChatArea}>
         {!isSidebarVisible && (
            <button onClick={toggleSidebarVisibility} className={`${styles.sidebarToggleButton} ${styles.sidebarToggleButtonHidden}`} title="Show Sidebar">{'›'}</button>
         )}

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
                 marginLeft: '40px',
                 color: isDarkMode ? '#e0e0e0' : 'inherit',
                 gap: '10px' // Add gap between header items
             }}>
                 <h3 style={{ color: isDarkMode ? '#e0e0e0' : 'inherit', flexGrow: 1, margin: 0 }}>{currentSession.title || 'Untitled Chat'}</h3> {/* Allow title to grow */}
                 {/* Ensure New Chat Button is removed from here */}
                 <button
                     onClick={handleToggleShare}
                     disabled={shareLoading}
                     className={styles.sendButton} // Use the send button class
                     style={{ // Keep only necessary inline styles that differ from .sendButton
                         background: isDarkMode ? '#3a3d41' : '#f8f9fa', // Custom background
                         color: isDarkMode ? '#e0e0e0' : 'inherit', // Custom text color
                         border: `1px solid ${isDarkMode ? '#555' : '#dee2e6'}`, // Add border back if needed
                         // Remove padding and fontSize to inherit from .sendButton
                     }}
                 >
                     {shareLoading ? '...' : (currentSession.isShared ? t('chat_unshare_button') : t('chat_share_button'))}
                 </button>
             </div>
             {currentSession.isShared && currentSession.shareId && (
                <div style={{
                    marginBottom: '10px',
                    padding: '5px',
                    background: isDarkMode ? '#3a3d41' : '#f0f0f0',
                    color: isDarkMode ? '#e0e0e0' : 'inherit',
                    borderRadius: '4px',
                    marginLeft: '40px',
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
                 messages.map((msg) => (
                   <div key={msg._id} className={`${styles.messageRow} ${msg.sender === 'user' ? styles.messageRowUser : styles.messageRowAi}`}>
                        
                        {/* --- AI MESSAGE --- */}
                        {msg.sender === 'ai' && (
                            <>
                                {/* Reasoning Steps (conditionally rendered first) */}
                                {showReasoning && reasoningSteps[msg._id] && (
                                    /* Remove open={showReasoning} to default to closed */
                                    <details style={{ marginBottom: '10px', marginLeft: '10px', marginRight: '10px', fontSize: '0.85em', opacity: 0.8 }}>
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
                                            {/* Display accumulated reasoning string */}
                                            {reasoningSteps[msg._id]} 
                                        </pre>
                                    </details>
                                )}
                                {/* AI Bubble + Button Wrapper */}
                                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                    <CopyButton textToCopy={msg.content} /> {/* Button before bubble */}
                                    <div
                                    className={`${styles.messageBubble}`}
                                    style={{
                                        background: isDarkMode ? '#3a3d41' : '#e9ecef', // AI Background
                                        color: isDarkMode ? '#e0e0e0' : '#343a40', // AI Text Color
                                    }}
                                >
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
                                        {streamingMessageId === msg._id ? streamingMessageContent : msg.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </>
                    )}

                    {/* --- USER MESSAGE --- */}
                    {msg.sender === 'user' && (
                        <>
                            {/* User Bubble */}
                            <div
                                className={`${styles.messageBubble}`}
                                style={{ // User bubble styles
                                    background: isDarkMode ? '#0d6efd' : '#007bff',
                                    color: 'white',
                                }}
                            >
                                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                            </div>
                            {/* User Button */}
                            <CopyButton textToCopy={msg.content} />
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
                 {/* Model Select and Streaming Toggle Row */}
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                     {!loadingModels && Object.keys(availableModels).length > 0 && (
                         <> {/* Use Fragment to group label and select */}
                             <label htmlFor="model-select" style={{
                                 marginRight: '5px', // Reduced margin
                             fontSize: '0.9em',
                             color: isDarkMode ? '#bbb' : '#6c757d'
                             }}>{t('chat_model_select_label')}</label>
                             <select
                                 id="model-select"
                             value={selectedModel}
                             onChange={(e) => setSelectedModel(e.target.value)}
                             style={{
                                 padding: '5px 8px',
                                 borderRadius: '4px',
                                 border: `1px solid ${isDarkMode ? '#555' : '#ced4da'}`,
                                 background: isDarkMode ? '#3a3d41' : 'white',
                                 color: isDarkMode ? '#e0e0e0' : 'inherit'
                             }}
                         >
                                 <option value="">{t('chat_model_default')}</option>
                                 {Object.entries(availableModels).map(([provider, models]) => ( <optgroup label={provider} key={provider}> {models.map(modelName => (<option key={modelName} value={modelName}>{modelName}</option>))} </optgroup> ))}
                             </select>
                         </>
                     )}
                     {/* REMOVED Streaming Toggle Icon Button */}
                     
                     {/* Reasoning Toggle Icon Button (Now also controls streaming) */}
                     <button
                         type="button"
                         // style={{ marginLeft: 'auto' }} // Removed duplicate style attribute
                         onClick={() => setShowReasoning(!showReasoning)}
                         title={showReasoning ? "Hide Reasoning Steps" : "Show Reasoning Steps"}
                         style={{ // Merged styles
                             marginLeft: 'auto', // Push reasoning button to the right
                             background: 'none',
                             border: 'none',
                             cursor: 'pointer',
                             fontSize: '1.3em',
                             padding: '0 5px',
                             color: '#fff', // Base color
                             opacity: showReasoning ? 1 : 0.5 // Indicate status with opacity
                         }}
                     >
                         🧠 {/* Brain icon */}
                     </button>
                 </div>

                 {/* Input Controls Row */}
                 <div className={styles.inputControls}>
                     <input type="file" ref={fileInputRef} onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} style={{ display: 'none' }} id="file-upload" />
                     <button
                         type="button"
                         onClick={() => fileInputRef.current?.click()}
                         disabled={sendingMessage || loadingMessages || !currentSession}
                         className={styles.fileUploadButton}
                         style={{
                             background: isDarkMode ? '#444' : '#eee',
                             border: `1px solid ${isDarkMode ? '#666' : '#ccc'}`,
                             color: isDarkMode ? '#eee' : 'inherit'
                         }}
                         title={selectedFile ? `Selected: ${selectedFile.name}` : t('chat_attach_file')}
                     >
                         📎
                     </button>
                     {selectedFile && (
                         <span
                             className={styles.fileName}
                             style={{ color: isDarkMode ? '#bbb' : '#6c757d' }}
                         >
                             {selectedFile.name}
                         </span>
                     )}
                     <input
                         type="text"
                         value={newMessage}
                         onChange={(e) => setNewMessage(e.target.value)}
                         placeholder={t('chat_input_placeholder')}
                         disabled={sendingMessage || loadingMessages || !currentSession}
                         className={styles.messageInput}
                         style={{
                             background: isDarkMode ? '#3a3d41' : 'white',
                             border: `1px solid ${isDarkMode ? '#555' : '#ced4da'}`,
                             color: isDarkMode ? '#e0e0e0' : 'inherit'
                         }}
                     />
                     <button
                         type="submit"
                         disabled={sendingMessage || loadingMessages || (!newMessage.trim() && !selectedFile)}
                         className={styles.sendButton}
                         style={{
                             background: isDarkMode
                                 ? (sendingMessage || loadingMessages || (!newMessage.trim() && !selectedFile)
                                     ? '#495057'
                                     : '#0d6efd')
                                 : (sendingMessage || loadingMessages || (!newMessage.trim() && !selectedFile)
                                     ? '#6c757d'
                                     : '#007bff')
                         }}
                     >
                         {sendingMessage ? t('chat_sending_button') : t('chat_send_button')}
                     </button>
                </div>
             </form>
           </>
         ) : ( <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}> <p>{t('chat_select_prompt')}</p> </div> )}
       </div>
     </div>
   );
 };

 export default ChatPage;
