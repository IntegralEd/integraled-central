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

// Create a global function to mount the chat
window.mountRAGChat = () => {
  console.log('Mounting RAG Chat...');
  
  // Create root element if it doesn't exist
  let root = document.getElementById('rag-chat-root');
  if (!root) {
    console.log('Creating root element...');
    root = document.createElement('div');
    root.id = 'rag-chat-root';
    document.body.appendChild(root);
  }

  // Mount React component
  try {
    console.log('Attempting to render Chat component...');
    ReactDOM.render(<Chat />, root);
    console.log('Chat component rendered successfully');
    return true;
  } catch (error) {
    console.error('Failed to render Chat:', error);
    return false;
  }
};

// Try to mount immediately
console.log('Chat bundle loaded, attempting immediate mount...');
window.mountRAGChat();

export default Chat; 