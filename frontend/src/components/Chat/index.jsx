import React, { useState, useEffect } from 'react';
import '../../styles/chat.css';

const Chat = () => {
    const [isReady, setIsReady] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Wait for credentials/context
        const initChat = async () => {
            try {
                // Get URL params
                const params = new URLSearchParams(window.location.search);
                const userId = params.get('user_id');
                const userEmail = params.get('email');

                if (userId && userEmail) {
                    setIsReady(true);
                }
            } catch (error) {
                console.error('Init error:', error);
            }
        };

        initChat();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('https://lfx6tvyrslqyrpmhphy3bkbrza0clbxv.lambda-url.us-east-2.on.aws/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: input })
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const data = await response.json();
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: data.message 
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

    return (
        <div className="chat-container">
            <div className="message-list">
                {messages.map((msg, i) => (
                    <div key={i} className={`message ${msg.role}`}>
                        <div className="message-content">{msg.content}</div>
                    </div>
                ))}
                {isLoading && (
                    <div className="message assistant">
                        <div className="message-content loading">
                            <div className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <form onSubmit={handleSubmit} className="input-area">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question..."
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send'}
                </button>
            </form>
        </div>
    );
};

export default Chat; 