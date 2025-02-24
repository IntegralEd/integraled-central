import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { getUserNamespace } from '../../utils/auth';
import { queryPinecone } from '../../utils/pinecone';
import { getConfig } from '../../utils/config';
import '../../styles/chat.css';

// Main Chat component
const Chat = ({ defaultNamespace = 'NS1' }) => {
  const [isReady, setIsReady] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [namespace, setNamespace] = useState(defaultNamespace);

  // Initialize chat with config only
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Test config access
        const config = await getConfig();
        console.log('Config received:', config);
        if (!config.pinecone_url || !config.pinecone_api_key || !config.pinecone_index) {
          throw new Error('Invalid config: Missing required Pinecone configuration');
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
        const config = await getConfig();
        
        // Create a thread or use existing one
        const thread = await fetch('https://api.openai.com/v1/threads', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.openai_api_key}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v1'
            }
        });
        
        const threadData = await thread.json();
        
        // Add message to thread
        await fetch(`https://api.openai.com/v1/threads/${threadData.id}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.openai_api_key}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v1'
            },
            body: JSON.stringify({
                role: 'user',
                content: input
            })
        });

        // Run the assistant
        const run = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/runs`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.openai_api_key}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v1'
            },
            body: JSON.stringify({
                assistant_id: "g-67acc6484b608191ba1f819f34fc467c-be-more-like-b-more",
                instructions: "Use the Baltimore health database when specific information is needed."
            })
        });

        // Poll for completion
        const runData = await run.json();
        const response = await pollRunStatus(threadData.id, runData.id, config.openai_api_key);

        // Get messages after completion
        const messages = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/messages`, {
            headers: {
                'Authorization': `Bearer ${config.openai_api_key}`,
                'OpenAI-Beta': 'assistants=v1'
            }
        });

        const messageData = await messages.json();
        const lastMessage = messageData.data[0];

        setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: lastMessage.content[0].text.value 
        }]);

    } catch (error) {
        console.error('Chat error:', error);
        setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: 'Sorry, I encountered an error. Please try again later.' 
        }]);
    } finally {
        setIsLoading(false);
    }
};

// Helper function to poll run status
const pollRunStatus = async (threadId, runId, apiKey) => {
    while (true) {
        const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'OpenAI-Beta': 'assistants=v1'
            }
        });

        const data = await response.json();
        if (data.status === 'completed') {
            return data;
        } else if (data.status === 'failed') {
            throw new Error('Assistant run failed');
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
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