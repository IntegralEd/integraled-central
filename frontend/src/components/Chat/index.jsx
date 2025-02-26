import React, { useState, useEffect } from 'react';
import '../../styles/chat.css';

const Chat = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [user, setUser] = useState(null);
    
    // Extract user info from URL parameters
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const userId = params.get('User_ID') || 'anonymous';
        const organization = params.get('Organization') || 'default';
        
        setUser({
            id: userId,
            organization: organization
        });
        
        console.log('👤 User context:', { userId, organization });
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

            console.log('📥 Response status:', response.status);
            const data = await response.json();
            console.log('📦 Response data:', data);

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

    const handleSaveToProfile = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(LAMBDA_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user?.id,
                    organization: user?.organization,
                    manualSave: true,
                    messages: messages
                })
            });
            
            const data = await response.json();
            addMessage('system', `✅ ${data.message}`);
        } catch (error) {
            addMessage('system', '❌ Failed to save conversation');
        } finally {
            setIsSaving(false);
        }
    };

    const handleWebhookResponse = (response) => {
        if (response.displayType === 'banner') {
            const banner = document.createElement('div');
            banner.className = 'webhook-banner fade-in';
            // Replace template variables
            const message = response.message.replace('{{Name}}', userName || 'there');
            banner.innerHTML = message;
            
            document.querySelector('.chat-container').appendChild(banner);
            
            // Fade out after duration
            setTimeout(() => {
                banner.classList.add('fade-out');
                setTimeout(() => banner.remove(), 1000);
            }, response.duration || 5000);
        }
    };

    const ResponseHandler = {
        // Success Handlers
        "200": async ({ thread_id, message }) => {
            // Start streaming response
            startMessageStream(thread_id);
            showNotification("Agent is responding...", "stream");
        },

        "220": async ({ agent_id }) => {
            // Initialize new agent session
            const agentConfig = {
                "integral_math": { name: "Math Tutor", context: "mathematics" },
                "bmore_health": { name: "Health Navigator", context: "maternal_health" }
            };
            
            await initializeAgent(agent_id, agentConfig[agent_id]);
            showNotification(`Connected to ${agentConfig[agent_id].name}`, "agent");
        },

        "230": async ({ thread_id, context }) => {
            // Reconnect to existing thread
            await loadThreadHistory(thread_id);
            showNotification("Continuing previous conversation", "thread");
        },

        "300": async ({ action, params }) => {
            // Handle dynamic actions
            const actions = {
                summarize_thread: summarizeConversation,
                switch_agent: initiateAgentTransfer,
                save_profile: saveToUserProfile
            };
            
            if (actions[action]) {
                await actions[action](params);
            }
        },

        // Error Handlers
        "400": ({ error }) => {
            showNotification(`Error: ${error}`, "error");
        },

        "420": async () => {
            showNotification("Please log in to continue", "auth");
            redirectToAuth();
        }
    };

    // Usage in Lambda response handler
    const handleLambdaResponse = async (response) => {
        const { status, payload } = response;
        
        try {
            if (ResponseHandler[status]) {
                await ResponseHandler[status](payload);
            }
        } catch (error) {
            console.error(`Handler error: ${status}`, error);
            showNotification("Something went wrong", "error");
        }
    };

    const formatMessage = (content) => {
        // Handle different message formats
        if (typeof content === 'object') {
            return processRichContent(content);
        }
        
        // Basic markdown-style parsing
        return content
            .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            .replace(/\[ACTION:(.*?)\]/g, (_, action) => {
                console.log('🎯 Action detected:', action);
                return `<button class="action-button" onclick="handleAction('${action}')">${action}</button>`;
            });
    };

    const processRichContent = (content) => {
        if (content.type === 'resource') {
            console.log('📚 Resource link:', content.url);
            return `
                <div class="resource-card">
                    <h4>${content.title}</h4>
                    <p>${content.description}</p>
                    <a href="${content.url}" target="_blank">View Resource</a>
                </div>
            `;
        }
        return content.text || '';
    };

    return (
        <div className="chat-container">
            <div className="message-list">
                {messages.map((msg, i) => (
                    <div key={i} className={`message ${msg.role}`}>
                        <div className="message-content">{formatMessage(msg.content)}</div>
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
            <div className="action-bar">
                <button 
                    onClick={handleSaveToProfile}
                    disabled={isSaving || messages.length === 0}
                >
                    {isSaving ? 'Saving...' : 'Save to My Profile'}
                </button>
            </div>
        </div>
    );
};

export default Chat; 