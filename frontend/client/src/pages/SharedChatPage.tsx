import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../services/api';
import CopyButton from '../components/CopyButton';
import ReactMarkdown from 'react-markdown'; // Import ReactMarkdown
import remarkGfm from 'remark-gfm'; // Import GFM plugin
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'; // Import SyntaxHighlighter
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Import Prism style

interface Message {
  _id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
  // Add modelUsed if you want to display it (optional)
  modelUsed?: string | null;
}

interface SharedChatData {
    _id: string;
    title: string;
    createdAt: string;
    messages: Message[];
}

const SharedChatPage: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [chatData, setChatData] = useState<SharedChatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="shared-chat-page" style={{ padding: '20px', maxWidth: '900px', margin: '20px auto', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px' }}>
      <h2 style={{ textAlign: 'center', color: '#343a40' }}>{chatData.title}</h2>
      <p style={{ color: '#6c757d', marginBottom: '20px', textAlign: 'center' }}>
        <small>Shared on: {new Date(chatData.createdAt).toLocaleString()}</small>
      </p>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '15px', padding: '10px', border: '1px solid #eee', background: '#fff', borderRadius: '8px', minHeight: '400px' }}>
        {chatData.messages.map((msg) => (
          <div
              key={msg._id}
              style={{
                  display: 'flex',
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: '12px',
                  alignItems: 'flex-end',
              }}
          >
              {msg.sender === 'ai' && <CopyButton textToCopy={msg.content} />}
              <div style={{
                  padding: '10px 15px',
                  borderRadius: '15px',
                  background: msg.sender === 'user' ? '#007bff' : '#e9ecef',
                  color: msg.sender === 'user' ? 'white' : '#343a40',
                  maxWidth: '75%',
                  wordWrap: 'break-word',
              }}>
                  {/* Use ReactMarkdown for AI messages */}
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
                  ) : (
                      // Keep plain div for user messages
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  )}
              </div>
              {msg.sender === 'user' && <CopyButton textToCopy={msg.content} />}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SharedChatPage;
