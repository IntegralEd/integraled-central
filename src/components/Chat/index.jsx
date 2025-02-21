import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import '../../styles/chat.css';

// Main Chat component
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

// Initialize function that gets called when script loads
function initialize() {
  console.log('Initializing chat...');
  const root = document.getElementById('rag-chat-root');
  if (!root) {
    console.error('Could not find root element');
    return;
  }
  
  try {
    ReactDOM.render(<Chat />, root);
    console.log('Chat mounted successfully');
  } catch (error) {
    console.error('Failed to mount chat:', error);
  }
}

// Call initialize when script loads
initialize();

// Also expose initialize globally
window.initializeChat = initialize;

export default Chat; 