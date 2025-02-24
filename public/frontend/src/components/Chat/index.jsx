import React, { useState } from 'react';
import '../../styles/chat.css';

const Chat = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        console.log('📤 Sending message:', { 
            message: input,
            user: user?.id,
            organization: user?.organization 
        });

        setIsLoading(true);
        try {
            const response = await fetch('https://lfx6tvyrslqyrpmhphy3bkbrza0clbxv.lambda-url.us-east-2.on.aws', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: input,
                    User_ID: user?.id,
                    Organization: user?.organization
                })
            });

            const data = await response.json();
            setMessages(prev => [...prev, 
                { role: 'user', content: input },
                { role: 'assistant', content: data.message }
            ]);
        } catch (error) {
            console.error('❌ Chat error:', error);
        } finally {
            setIsLoading(false);
            setInput('');
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
                    placeholder="Ask about maternal health..."
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading}>Send</button>
            </form>
        </div>
    );
};

export default Chat;
