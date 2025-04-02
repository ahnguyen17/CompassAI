import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import apiClient from '../services/api';
import CopyButton from '../components/CopyButton';
import { useTranslation } from 'react-i18next';
import styles from './ChatPage.module.css'; // Import CSS Module

// Interfaces (assuming they are defined correctly)
interface AvailableModels { [provider: string]: string[]; }
interface ChatSession { _id: string; title: string; createdAt: string; isShared?: boolean; shareId?: string; }
interface ChatMessage { _id: string; sender: 'user' | 'ai'; content: string; timestamp: string; modelUsed?: string | null; fileInfo?: { filename: string; originalname: string; mimetype: string; size: number; path: string; } }

const ChatPage: React.FC = () => {
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
  const [isSidebarVisible, setIsSidebarVisible] = useState(true); // Keep state for toggling
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sessionId: routeSessionId } = useParams<{ sessionId?: string }>();

  // --- Fetch Functions (keep as before) ---
  const fetchSessions = async () => { setLoadingSessions(true); setError(''); try { const response = await apiClient.get('/chatsessions'); if (response.data?.success) setSessions(response.data.data); else setError('Failed to load chat sessions.'); } catch (err: any) { setError(err.response?.data?.error || 'Error loading sessions.'); if (err.response?.status === 401) navigate('/login'); } finally { setLoadingSessions(false); } };
  const fetchAvailableModels = async () => { setLoadingModels(true); try { const response = await apiClient.get('/providers/models'); if (response.data?.success) setAvailableModels(response.data.data); else console.error("Failed to fetch available models"); } catch (err: any) { console.error("Error fetching available models:", err); if (err.response?.status === 401) navigate('/login'); } finally { setLoadingModels(false); } };
  const handleDeleteSession = async (sessionId: string, sessionTitle: string) => { if (!window.confirm(`Are you sure you want to delete the chat "${sessionTitle || 'Untitled Chat'}"?`)) return; setDeleteLoading(sessionId); setError(''); try { const response = await apiClient.delete(`/chatsessions/${sessionId}`); if (response.data?.success) { setSessions(prev => prev.filter(s => s._id !== sessionId)); if (currentSession?._id === sessionId) { setCurrentSession(null); setMessages([]); navigate('/'); } } else { setError('Failed to delete chat session.'); } } catch (err: any) { setError(err.response?.data?.error || 'Error deleting session.'); if (err.response?.status === 401) navigate('/login'); } finally { setDeleteLoading(null); } };
  const handleToggleShare = async () => { if (!currentSession) return; setShareLoading(true); setError(''); const newShareStatus = !currentSession.isShared; try { const response = await apiClient.put(`/chatsessions/${currentSession._id}`, { isShared: newShareStatus }); if (response.data?.success) { const updatedSession = response.data.data; setCurrentSession(updatedSession); setSessions(prev => prev.map(s => s._id === updatedSession._id ? updatedSession : s)); } else { setError('Failed to update sharing status.'); } } catch (err: any) { setError(err.response?.data?.error || 'Error updating sharing status.'); if (err.response?.status === 401) navigate('/login'); } finally { setShareLoading(false); } };
  const fetchMessages = async (sessionId: string) => { if (!sessionId) return; setLoadingMessages(true); setError(''); setMessages([]); try { const response = await apiClient.get(`/chatsessions/${sessionId}/messages`); if (response.data?.success) { const fetchedMessages: ChatMessage[] = response.data.data; setMessages(fetchedMessages); const lastAiMessage = [...fetchedMessages].reverse().find(m => m.sender === 'ai' && m.modelUsed); setSelectedModel(lastAiMessage?.modelUsed || ''); } else { setError('Failed to load messages for this session.'); } } catch (err: any) { setError(err.response?.data?.error || 'Error loading messages.'); if (err.response?.status === 401) navigate('/login'); } finally { setLoadingMessages(false); } };
  const handleSelectSession = (session: ChatSession) => { setCurrentSession(session); navigate(`/chat/${session._id}`); fetchMessages(session._id); };
  const handleNewChat = async () => { setError(''); try { const response = await apiClient.post('/chatsessions', { title: 'New Chat' }); if (response.data?.success) { const newSession: ChatSession = response.data.data; setSessions([newSession, ...sessions]); handleSelectSession(newSession); setSelectedModel(''); } else { setError('Failed to create new chat.'); } } catch (err: any) { setError(err.response?.data?.error || 'Error creating chat.'); if (err.response?.status === 401) navigate('/login'); } };
  const handleSendMessage = async (e?: React.FormEvent) => { if (e) e.preventDefault(); if ((!newMessage.trim() && !selectedFile) || !currentSession?._id || sendingMessage) return; const sessionId = currentSession._id; setSendingMessage(true); setError(''); const userMessageContent = newMessage; const fileToSend = selectedFile; setNewMessage(''); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; const formData = new FormData(); formData.append('content', userMessageContent); if (fileToSend) formData.append('file', fileToSend); if (selectedModel) formData.append('model', selectedModel); const optimisticUserMessage: ChatMessage = { _id: `temp-${Date.now()}`, sender: 'user', content: userMessageContent + (fileToSend ? `\n\n[Uploading: ${fileToSend.name}]` : ''), timestamp: new Date().toISOString() }; setMessages(prev => [...prev, optimisticUserMessage]); try { const response = await apiClient.post(`/chatsessions/${sessionId}/messages`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); if (response.data?.success) { const aiMessage = response.data.data; setMessages(prev => [...prev.filter(m => m._id !== optimisticUserMessage._id), optimisticUserMessage, aiMessage]); if (aiMessage.modelUsed) setSelectedModel(aiMessage.modelUsed); if (response.data.updatedSessionTitle && currentSession) { const newTitle = response.data.updatedSessionTitle; setCurrentSession(prev => prev ? { ...prev, title: newTitle } : null); setSessions(prevSessions => prevSessions.map(s => s._id === currentSession._id ? { ...s, title: newTitle } : s )); } } else { setError('Failed to send message or get AI response.'); setMessages(prev => prev.filter(m => m._id !== optimisticUserMessage._id)); } } catch (err: any) { setError(err.response?.data?.error || 'Error sending message.'); setMessages(prev => prev.filter(m => m._id !== optimisticUserMessage._id)); if (err.response?.status === 401) navigate('/login'); } finally { setSendingMessage(false); } };

  // --- Effects (keep as before) ---
  useEffect(() => { fetchSessions(); fetchAvailableModels(); }, []);
  useEffect(() => { if (routeSessionId && routeSessionId !== currentSession?._id) { const sessionFromRoute = sessions.find(s => s._id === routeSessionId); if (sessionFromRoute) { setCurrentSession(sessionFromRoute); fetchMessages(sessionFromRoute._id); } else { console.warn(`Session ID ${routeSessionId} from URL not found.`); } } }, [routeSessionId, sessions]);

  // --- Toggle Sidebar Visibility ---
  const toggleSidebarVisibility = () => setIsSidebarVisible(!isSidebarVisible);

  // --- Render ---
  return (
    <div className={styles.chatPageContainer}>
      {/* Sidebar - Apply CSS Module classes */}
      <div
          className={`${styles.chatSidebar} ${isSidebarVisible ? styles.chatSidebarVisible : styles.chatSidebarHidden}`}
          // Inline styles removed, controlled by CSS Module now
      >
         {/* Render content only when sidebar should be visible (even during transition) */}
         {isSidebarVisible && (
             <>
                {/* Sidebar Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <button onClick={handleNewChat} style={{ flexGrow: 1, marginRight: '10px', padding: '10px 15px', fontSize: '1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>{t('chat_new_button')}</button>
                    {/* Moved Toggle Button Inside Sidebar */}
                    <button
                        onClick={toggleSidebarVisibility}
                        className={styles.sidebarToggleButton} // Use existing class for now, will adjust styles
                        title="Hide Sidebar"
                        style={{ flexShrink: 0 }} // Prevent shrinking
                    >
                        {'‹'}
                    </button>
                </div>
                <h4 style={{ marginTop: 0, marginBottom: '10px', color: '#495057' }}>{t('chat_history_title')}</h4>
                {loadingSessions ? <p>{t('chat_loading')}</p> : error && !sessions.length ? <p style={{ color: 'red' }}>{error}</p> : sessions.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {sessions.map((session) => ( <li key={session._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', cursor: 'pointer', marginBottom: '5px', borderRadius: '5px', backgroundColor: currentSession?._id === session._id ? '#e9ecef' : 'transparent', color: '#495057' }} title={session.title}> <span onClick={() => handleSelectSession(session)} style={{ flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '10px' }}> {session.title || 'Untitled Chat'} </span> <button onClick={(e) => { e.stopPropagation(); handleDeleteSession(session._id, session.title); }} disabled={deleteLoading === session._id} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '1.1em', padding: '0 5px', lineHeight: '1' }} title="Delete Chat"> {deleteLoading === session._id ? '...' : '×'} </button> </li> ))}
                </ul> ) : <p>{t('chat_no_history')}</p>}
             </>
         )}
      </div>

      {/* Main Chat Area - Apply CSS Module class */}
      <div className={styles.mainChatArea}>
         {/* Toggle Button - Render only when sidebar is hidden */}
         {!isSidebarVisible && (
            <button
                onClick={toggleSidebarVisibility}
                className={`${styles.sidebarToggleButton} ${styles.sidebarToggleButtonHidden}`} // Apply hidden style for positioning
                title="Show Sidebar"
            >
                {'›'}
            </button>
         )}

         {currentSession ? (
           <>
             {/* Header */}
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #dee2e6', marginLeft: '40px' /* Keep margin for toggle button space */ }}>
                 <h3 style={{ margin: 0, color: '#343a40' }}>{currentSession.title || 'Untitled Chat'}</h3>
                 <button onClick={handleToggleShare} disabled={shareLoading} style={{ padding: '6px 12px', fontSize: '0.9rem', cursor: 'pointer' }}> {shareLoading ? '...' : (currentSession.isShared ? t('chat_unshare_button') : t('chat_share_button'))} </button>
             </div>
             {currentSession.isShared && currentSession.shareId && ( <div style={{ marginBottom: '10px', padding: '5px', background: '#f0f0f0', borderRadius: '4px', marginLeft: '40px' }}> {t('chat_share_link')} <a href={`/share/${currentSession.shareId}`} target="_blank" rel="noopener noreferrer">{window.location.origin}/share/{currentSession.shareId}</a> </div> )}

             {/* Messages - Apply CSS Module class */}
             <div className={styles.messageList}>
               {loadingMessages ? <p>{t('chat_loading_messages')}</p> : messages.length > 0 ? (
                 messages.map((msg) => (
                   <div key={msg._id} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', marginBottom: '12px', alignItems: 'flex-end' }}>
                       {msg.sender === 'ai' && <CopyButton textToCopy={msg.content} />}
                       <div style={{ padding: '10px 15px', borderRadius: '15px', background: msg.sender === 'user' ? '#007bff' : '#e9ecef', color: msg.sender === 'user' ? 'white' : '#343a40', maxWidth: '75%', wordWrap: 'break-word' }}>
                           {msg.sender === 'ai' ? (
                               <ReactMarkdown
                                   remarkPlugins={[remarkGfm]}
                                   components={{
                                       code({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
                                           const match = /language-(\w+)/.exec(className || '');
                                           return match ? (
                                               <SyntaxHighlighter
                                                   style={prism as any}
                                                   language={match[1]}
                                                >
                                                   {String(children).replace(/\n$/, '')}
                                               </SyntaxHighlighter>
                                           ) : (
                                               <code className={className} {...props}>
                                                   {children}
                                               </code>
                                           );
                                       }
                                   }}
                               >{msg.content}</ReactMarkdown>
                           ) : ( <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div> )}
                           {/* Removed model display */}
                       </div>
                        {msg.sender === 'user' && <CopyButton textToCopy={msg.content} />}
                   </div>
                 ))
               ) : <p>{t('chat_start_message')}</p>}
                {error && <p style={{ color: 'red' }}>Error: {error}</p>}
             </div>

             {/* Input Area - Apply CSS Module classes */}
             <form onSubmit={handleSendMessage} className={styles.inputForm}>
                 {!loadingModels && Object.keys(availableModels).length > 0 && (
                      <div style={{ marginBottom: '10px' }}>
                         <label htmlFor="model-select" style={{ marginRight: '10px', fontSize: '0.9em', color: '#6c757d' }}>{t('chat_model_select_label')}</label>
                         <select id="model-select" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid #ced4da' }}>
                             <option value="">{t('chat_model_default')}</option>
                             {Object.entries(availableModels).map(([provider, models]) => ( <optgroup label={provider} key={provider}> {models.map(modelName => (<option key={modelName} value={modelName}>{modelName}</option>))} </optgroup> ))}
                         </select>
                     </div>
                 )}
                <div className={styles.inputControls}>
                     <input type="file" ref={fileInputRef} onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} style={{ display: 'none' }} id="file-upload" />
                     <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sendingMessage || loadingMessages || !currentSession} className={styles.fileUploadButton} title={selectedFile ? `Selected: ${selectedFile.name}` : t('chat_attach_file')}>📎</button>
                     {selectedFile && (<span className={styles.fileName}>{selectedFile.name}</span>)}
                     <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={t('chat_input_placeholder')} disabled={sendingMessage || loadingMessages || !currentSession} className={styles.messageInput} />
                     <button type="submit" disabled={sendingMessage || loadingMessages || (!newMessage.trim() && !selectedFile)} className={styles.sendButton}> {sendingMessage ? t('chat_sending_button') : t('chat_send_button')} </button>
                </div>
             </form>
           </>
         ) : ( <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}> <p>{t('chat_select_prompt')}</p> </div> )}
       </div>
     </div>
   );
 };

 export default ChatPage;
