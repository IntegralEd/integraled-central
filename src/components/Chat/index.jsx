import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import '../../styles/chat.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');

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

// Create the mount function first
const mountChat = () => {
  const root = document.getElementById('rag-chat-root');
  if (root) {
    ReactDOM.render(<Chat />, root);
    return true;
  }
  return false;
};

// Expose to window immediately
window.RAGChat = {
  mount: mountChat
};

// Log that we're ready
console.log('Chat bundle loaded and RAGChat exposed to window');

export default Chat; 