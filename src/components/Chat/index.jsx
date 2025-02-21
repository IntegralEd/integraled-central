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

// Wait for Softr header and then mount
const waitForHeader = () => {
  console.log('Waiting for header...');
  
  // Look for the header element
  const headerElement = document.querySelector('header');
  if (headerElement) {
    console.log('Header found, proceeding with mount');
    let root = document.getElementById('rag-chat-root');
    if (!root) {
      console.log('Creating root element');
      root = document.createElement('div');
      root.id = 'rag-chat-root';
      document.body.appendChild(root);
    }
    
    try {
      console.log('Mounting React component');
      ReactDOM.render(<Chat />, root);
      console.log('Mount successful');
    } catch (error) {
      console.error('Mount failed:', error);
    }
  } else {
    console.log('Header not found, retrying...');
    setTimeout(waitForHeader, 100);
  }
};

// Start waiting for header when bundle loads
console.log('Bundle loaded, starting header check');
waitForHeader();

export default Chat; 