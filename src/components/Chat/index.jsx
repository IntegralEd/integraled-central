import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import '../../styles/chat.css';

const Chat = ({ userContext }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    console.log('Chat mounted with context:', userContext);
  }, [userContext]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          email: userContext.email,
          history: messages
        })
      });

      const data = await response.json();
      setMessages([...newMessages, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Chat error:', error);
    }
  };

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

// Self-mounting function
const mountChat = () => {
  const rootElement = document.getElementById('rag-chat-root');
  if (rootElement && window.logged_in_user) {
    const userContext = {
      email: window.logged_in_user.Email
    };
    ReactDOM.render(<Chat userContext={userContext} />, rootElement);
    console.log('Chat mounted with email:', userContext.email);
  } else {
    console.log('Waiting for root element and user data...');
    setTimeout(mountChat, 100);
  }
};

// Export the mount function
window.mountChat = mountChat;

// Auto-mount when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountChat);
} else {
  mountChat();
}

export default Chat; 