import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Import useNavigate
import apiClient from '../services/api';
import CopyButton from '../components/CopyButton';
import ReactMarkdown from 'react-markdown'; // Import ReactMarkdown
import remarkGfm from 'remark-gfm'; // Import GFM plugin
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'; // Import SyntaxHighlighter
import { prism, okaidia } from 'react-syntax-highlighter/dist/esm/styles/prism';
import useAuthStore from '../store/authStore'; // Import the auth store

interface Message {
  _id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
  modelUsed?: string | null;
  reasoningContent?: string | null; // Add reasoningContent field
}

interface SharedChatData {
    _id: string;
    title: string;
    createdAt: string;
    ownerId: string; // Add ownerId
    messages: Message[];
}

// Removed SharedChatPageProps interface

const SharedChatPage: React.FC = () => { // Removed props
  const { isDarkMode, isLoggedIn, currentUser, authLoading } = useAuthStore(); // Get auth state from store
  const navigate = useNavigate(); // Get navigate function
  const { shareId } = useParams<{ shareId: string }>();
  const [chatData, setChatData] = useState<SharedChatData | null>(null);
  const [loading, setLoading] = useState(true); // Loading for initial chat data
  const [error, setError] = useState('');
  const [isCopying, setIsCopying] = useState(false); // Loading state for copy action
  const [copyError, setCopyError] = useState(''); // Error state for copy action

  // Handler to copy the chat
  const handleCopyChat = async () => {
    if (!shareId || !chatData || !isLoggedIn || !currentUser || currentUser._id === chatData.ownerId) {
      setCopyError('Cannot copy this chat.'); // Should not happen if button logic is correct
      return;
    }
    setIsCopying(true);
    setCopyError('');
    try {
      const response = await apiClient.post(`/chatsessions/copy/${shareId}`);
      if (response.data?.success && response.data.data?.newSessionId) {
        // Success! Navigate directly to the newly copied chat
        const newSessionId = response.data.data.newSessionId;
        navigate(`/chat/${newSessionId}`);
        // Optionally show a success toast/message here
      } else {
        setCopyError(response.data?.error || 'Failed to copy chat or missing new session ID.');
      }
    } catch (err: any) {
      console.error('Error copying chat:', err);
      setCopyError(err.response?.data?.error || 'An unexpected error occurred while copying.');
    } finally {
      setIsCopying(false);
    }
  };

  // Handler to redirect to login
  const handleLoginRedirect = () => {
    navigate('/login');
  };


  useEffect(() => {
    const fetchSharedChat = async () => {
      if (!shareId) return;
      setLoading(true);
      setError('');
      try {
        console.log(`Fetching shared chat with ID: ${shareId}`);
        const response = await apiClient.get(`/chatsessions/shared/${shareId}`);

        if (response.data?.success) {
             setChatData(response.data.data);
        } else {
             setError(response.data?.error || 'Failed to load shared chat.');
        }
      } catch (err: any) {
        console.error('Error fetching shared chat:', err);
        if (err.response) {
             setError(err.response.data?.error || 'Failed to load shared chat. The link may be invalid or expired.');
        } else {
             setError('An unexpected error occurred while fetching the shared chat.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSharedChat();
  }, [shareId]);

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading shared chat...</div>;
  }

  if (error) {
    return <div style={{ color: 'red', padding: '20px' }}>{error}</div>;
  }

  if (!chatData) {
    return <div style={{ padding: '20px' }}>Shared chat not found.</div>;
  }

  // Define dark mode styles
  const containerStyle = {
    padding: '20px',
    maxWidth: '900px',
    margin: '20px auto',
    background: isDarkMode ? '#2a2a2a' : '#f8f9fa',
    border: `1px solid ${isDarkMode ? '#444' : '#dee2e6'}`,
    borderRadius: '8px',
    color: isDarkMode ? '#e0e0e0' : 'inherit'
  };

  const titleStyle = {
    textAlign: 'center' as const,
    color: isDarkMode ? '#e0e0e0' : '#343a40'
  };

  const subtitleStyle = {
    color: isDarkMode ? '#bbb' : '#6c757d',
    marginBottom: '20px',
    textAlign: 'center' as const
  };

  const messagesContainerStyle = {
    flex: 1 as const,
    overflowY: 'auto' as const,
    marginBottom: '15px',
    padding: '10px',
    border: `1px solid ${isDarkMode ? '#444' : '#eee'}`,
    background: isDarkMode ? '#1a1a1a' : '#fff',
    borderRadius: '8px',
    minHeight: '400px'
  };

  return (
    <div className="shared-chat-page" style={containerStyle}>
      <h2 style={titleStyle}>{chatData.title}</h2>
      <p style={subtitleStyle}>
        <small>Shared on: {new Date(chatData.createdAt).toLocaleString()}</small>
      </p>


      <div style={messagesContainerStyle}>
        {chatData.messages.map((msg) => (
          <div
              key={msg._id}
              style={{
                  display: 'flex',
                  // Make AI rows stack vertically if reasoning is present
                  flexDirection: (msg.sender === 'ai' && msg.reasoningContent) ? 'column' : 'row', 
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: '12px',
                  // Align items based on sender for non-column layout
                  alignItems: (msg.sender === 'ai' && msg.reasoningContent) ? 'stretch' : 'flex-end', 
              }}
          >
              {/* --- Render Reasoning Steps First if AI and content exists --- */}
              {msg.sender === 'ai' && msg.reasoningContent && (
                   <details style={{ marginBottom: '10px', marginLeft: '10px', marginRight: '10px', fontSize: '0.85em', opacity: 0.8, color: isDarkMode ? '#ccc' : '#555' }}>
                       <summary style={{ cursor: 'pointer' }}>Reasoning Steps</summary>
                       <pre style={{ 
                           background: isDarkMode ? '#2a2a2a' : '#f0f0f0', 
                           padding: '8px', 
                           borderRadius: '4px', 
                           whiteSpace: 'pre-wrap', 
                           wordBreak: 'break-all',
                           maxHeight: '200px',
                           overflowY: 'auto'
                       }}>
                           {msg.reasoningContent} 
                       </pre>
                   </details>
              )}

              {/* --- Render Bubble and Button --- */}
              {/* Wrap AI bubble/button for correct alignment */}
              {msg.sender === 'ai' && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%' }}> 
                      <CopyButton textToCopy={msg.content} />
                      <div style={{
                          padding: '10px 15px',
                          borderRadius: '15px',
                          background: isDarkMode ? '#3a3d41' : '#e9ecef', // AI Background
                          color: isDarkMode ? '#e0e0e0' : '#343a40', // AI Text Color
                          maxWidth: '75%',
                          wordWrap: 'break-word',
                          marginLeft: '5px', // Add space between button and bubble
                      }}>
                          <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                              code({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  // Create a custom style by overriding the background
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
                                      <SyntaxHighlighter
                                          style={customSyntaxTheme as any}
                                          language={match[1]}
                                          useInlineStyles={true}
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
                      </div>
                  </div>
              )}
              {/* Render User Bubble + Button */}
              {msg.sender === 'user' && (
                  <>
                      <div style={{
                          padding: '10px 15px',
                          borderRadius: '15px',
                          background: isDarkMode ? '#0d6efd' : '#007bff', // User Background
                          color: 'white', // User Text Color
                          maxWidth: '75%',
                          wordWrap: 'break-word',
                          marginRight: '5px', // Add space between bubble and button
                      }}>
                          <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                      </div>
                      <CopyButton textToCopy={msg.content} />
                  </>
              )}
          </div>
        ))}
      </div>

      {/* --- Conditional Button --- */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}> {/* Changed marginBottom to marginTop */}
        {!authLoading && chatData && (
          <>
            {isLoggedIn && currentUser && currentUser._id !== chatData.ownerId && (
              <button
                onClick={handleCopyChat}
                disabled={isCopying}
                style={{ padding: '10px 20px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}
              >
                {isCopying ? 'Copying...' : 'Chat with AI'}
              </button>
            )}
            {!isLoggedIn && (
              <button
                onClick={handleLoginRedirect}
                 style={{ padding: '10px 20px', cursor: 'pointer', background: '#6c757d', color: 'white', border: 'none', borderRadius: '5px' }}
              >
                Login to chat with AI
              </button>
            )}
          </>
        )}
        {copyError && <p style={{ color: 'red', marginTop: '10px' }}>{copyError}</p>}
      </div>
      {/* --- End Conditional Button --- */}

    </div>
  );
};

export default SharedChatPage;
