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
      <h3>Chat Interface (Mounted)</h3>
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

// Explicitly add to window
window.RAGChat = {
  Chat,
  mount: () => {
    console.log('Mount function called');
    const root = document.getElementById('rag-chat-root');
    if (root) {
      console.log('Found root element, mounting...');
      ReactDOM.render(<Chat />, root);
      console.log('Mount complete');
      return true;
    }
    console.log('Root element not found');
    return false;
  }
};

console.log('Bundle loaded, RAGChat available:', !!window.RAGChat);

export default Chat; 