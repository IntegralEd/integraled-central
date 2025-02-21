import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import '../../styles/chat.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    console.log('Chat component mounted');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');

    // Add mock response for testing
    setMessages([...newMessages, { 
      role: 'assistant', 
      content: `Test response to: ${input}` 
    }]);
  };

  return (
    <div className="chat-container">
      <h3>Chat Interface</h3>
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

// Make sure we wait for DOM content to be loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, attempting to mount Chat');
  const root = document.getElementById('rag-chat-root');
  if (root) {
    console.log('Found root element, mounting Chat');
    ReactDOM.render(<Chat />, root);
  } else {
    console.error('Could not find rag-chat-root element');
  }
});

// Also try mounting immediately in case DOMContentLoaded already fired
if (document.readyState === 'complete') {
  console.log('Document already complete, mounting Chat');
  const root = document.getElementById('rag-chat-root');
  if (root) {
    console.log('Found root element, mounting Chat');
    ReactDOM.render(<Chat />, root);
  } else {
    console.error('Could not find rag-chat-root element');
  }
}

export default Chat; 