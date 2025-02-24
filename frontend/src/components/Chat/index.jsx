import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { getUserNamespace } from '../../utils/auth';
import { queryPinecone } from '../../utils/pinecone';
import { getConfig } from '../../utils/config';
import '../../styles/chat.css';

// Main Chat component
const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // const [namespace, setNamespace] = useState('ns1'); // Comment out namespace

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const config = await getConfig();
      
      // Create thread for GPT Assistant
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
          assistant_id: config.openai_assistant_id
        })
      });

      const runData = await run.json();
      
      // Poll for completion
      let completed = false;
      while (!completed) {
        const runStatus = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/runs/${runData.id}`, {
          headers: {
            'Authorization': `Bearer ${config.openai_api_key}`,
            'OpenAI-Beta': 'assistants=v1'
          }
        });
        
        const statusData = await runStatus.json();
        if (statusData.status === 'completed') {
          completed = true;
        } else if (statusData.status === 'failed') {
          throw new Error('Assistant run failed');
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Get messages after completion
      const messages = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${config.openai_api_key}`,
          'OpenAI-Beta': 'assistants=v1'
        }
      });

      const messageData = await messages.json();
      const assistantMessage = messageData.data[0];

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: assistantMessage.content[0].text.value 
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

  // Comment out Pinecone-related useEffect
  /*useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const namespaceParam = urlParams.get('namespace');
    if (namespaceParam) {
      setNamespace(namespaceParam);
    }
  }, []);*/

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