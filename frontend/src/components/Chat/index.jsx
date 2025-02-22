import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { getUserNamespace } from '../../utils/auth';
import { queryPinecone } from '../../utils/pinecone';
import { getConfig } from '../../utils/config';
import '../../styles/chat.css';

// Main Chat component
const Chat = () => {
  const [isReady, setIsReady] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize chat only when user context is ready
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Wait for user context
        while (!window.pc_userEmail && !window.pc_userId) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Test config access
        const config = await getConfig();
        if (!config.pinecone_url || !config.PINECONE_API_KEY) {
          throw new Error('Invalid config');
        }

        setIsReady(true);
      } catch (error) {
        console.error('Chat initialization error:', error);
        setError('Failed to initialize chat. Please refresh the page.');
      }
    };

    initializeChat();
  }, []);

  // Show loading or error state
  if (!isReady) {
    return (
      <div className="chat-container">
        {error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div className="loading-message">Initializing chat...</div>
        )}
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get user's namespace
      const namespace = getUserNamespace();
      console.log('Using namespace:', namespace);
      
      // Query Pinecone
      const searchResults = await queryPinecone(input, namespace);
      console.log('Search results:', searchResults);
      
      // Format context from search results
      const context = searchResults.matches
        .map(match => match.metadata.text)
        .join('\n\n');

      // Get OpenAI config
      const config = await getConfig();
      
      // Query OpenAI with context
      const completion = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant. Answer questions based on the provided context."
            },
            {
              role: "user",
              content: `Context: ${context}\n\nQuestion: ${input}`
            }
          ]
        })
      });

      const data = await completion.json();
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.choices[0].message.content 
      }]);

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error connecting to the database. Please try again later.' 
      }]);
    } finally {
      setIsLoading(false);
    }
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