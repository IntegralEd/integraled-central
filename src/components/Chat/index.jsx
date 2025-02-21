import React, { useState, useEffect } from 'react';
import { initializeUserContext } from '../../utils/userContext';
import '../../styles/chat.css';

// Simplified chat interface
const Chat = ({ userContext }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [namespace, setNamespace] = useState('default'); // Will link to Softr identity

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');

    try {
      // Query Pinecone with namespace
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          namespace: namespace, // Will come from Softr
          history: messages 
        })
      });

      const data = await response.json();
      setMessages([...newMessages, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    // Initialize user context
    initializeUserContext();
  }, []);

  return (
    <div className="chat-container">
      <div className="message-list">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

// Export for UMD
if (typeof window !== 'undefined') {
  window.ChatComponent = Chat;
}

export default Chat; 