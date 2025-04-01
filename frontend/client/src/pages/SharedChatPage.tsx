import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../services/api'; // Import the API client
import CopyButton from '../components/CopyButton'; // Import the CopyButton

interface Message {
  _id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
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
        // Make the actual API call
        const response = await apiClient.get(`/chatsessions/shared/${shareId}`);

        if (response.data?.success) {
             setChatData(response.data.data); // Set the actual data from the API
        } else {
             setError(response.data?.error || 'Failed to load shared chat.');
        }
      } catch (err: any) { // Use 'any' for catch block error
        console.error('Error fetching shared chat:', err);
        // Check if it's an Axios error with a response
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

  // Apply similar container styles as ChatPage's main area
  return (
    <div className="shared-chat-page" style={{ padding: '20px', maxWidth: '900px', margin: '20px auto', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px' }}> {/* Add class */}
      <h2 style={{ textAlign: 'center', color: '#343a40' }}>{chatData.title}</h2>
      <p style={{ color: '#6c757d', marginBottom: '20px', textAlign: 'center' }}>
        <small>Shared on: {new Date(chatData.createdAt).toLocaleString()}</small>
      </p>
      {/* Message Display Area - Apply ChatPage styling */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '15px', padding: '10px', border: '1px solid #eee', background: '#fff', borderRadius: '8px', minHeight: '400px' /* Add min-height */ }}>
        {chatData.messages.map((msg) => (
          <div
              key={msg._id}
              style={{
                  display: 'flex',
                          justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                          marginBottom: '12px',
                          alignItems: 'flex-end', // Align items to bottom for copy button placement
                      }}
                  >
                       {/* Place copy button before AI message bubble */}
                       {msg.sender === 'ai' && <CopyButton textToCopy={msg.content} />}
                      <div style={{
                  padding: '10px 15px',
                  borderRadius: '15px',
                  background: msg.sender === 'user' ? '#007bff' : '#e9ecef',
                  color: msg.sender === 'user' ? 'white' : '#343a40',
                  maxWidth: '75%',
                  wordWrap: 'break-word', // Ensure long words wrap
              }}>
                  {/* Optional: Show sender name? */}
                  {/* <strong>{msg.sender === 'user' ? 'You' : 'AI'}:</strong> */}
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                          {/* Optional: Timestamp */}
                          {/* <small style={{ fontSize: '0.7em', color: msg.sender === 'user' ? '#d1e7fd' : '#6c757d', display: 'block', textAlign: 'right', marginTop: '5px' }}>{new Date(msg.timestamp).toLocaleTimeString()}</small> */}
              </div> {/* Closing div for message bubble */}
              {/* Place copy button after User message bubble */}
              {msg.sender === 'user' && <CopyButton textToCopy={msg.content} />}
          </div> // Closing div for message row
        ))} {/* Closing parenthesis for map */}
      </div> {/* Closing div for message display area */}
    </div> // Closing div for main container
  );
};

export default SharedChatPage;
