import React, { useState, useEffect } from 'react';
import '../../styles/chat.css';

const Chat = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Get user data from URL params using AirTable field names
        const params = new URLSearchParams(window.location.search);
        const User_ID = params.get('User_ID');
        const Email = params.get('Email');
        const Organization = params.get('Organization');

        console.log('🔍 URL Parameters:', { User_ID, Email, Organization });

        if (User_ID) {
            setUser({ id: User_ID, email: Email, organization: Organization });
            console.log('✅ User authenticated:', { User_ID, Email, Organization });
        }
    }, []);

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
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4-turbo-preview',
                    messages: [...messages, { role: 'user', content: input }]
                })
            });

            console.log('📥 Response status:', response.status);
            const data = await response.json();
            console.log('📦 Response data:', data);

            setMessages(prev => [...prev, 
                { role: 'user', content: input },
                data.choices[0].message
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