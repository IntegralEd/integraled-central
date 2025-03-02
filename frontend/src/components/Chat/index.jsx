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
        "200": async ({ thread_ids, message, context }) => {
            // Start streaming response with unified thread IDs
            startMessageStream(thread_ids.openai);
            showNotification("Agent is responding...", "stream");
            
            // Update local context
            updateThreadContext(context);
        },

        "220": async ({ agent_id, thread_ids, context }) => {
            // Initialize new agent session with unified thread tracking
            const agentConfig = {
                "integral_math": { name: "Math Tutor", context: "mathematics" },
                "bmore_health": { name: "Health Navigator", context: "maternal_health" }
            };
            
            await initializeAgent(agent_id, agentConfig[agent_id], thread_ids);
            showNotification(`Connected to ${agentConfig[agent_id].name}`, "agent");
            
            // Initialize context
            updateThreadContext(context);
        },

        "230": async ({ thread_ids, context }) => {
            // Reconnect to existing thread with platform-specific IDs
            await loadThreadHistory(thread_ids);
            showNotification("Continuing previous conversation", "thread");
            
            // Restore context
            updateThreadContext(context);
        },

        "300": async ({ action, params, thread_ids, context }) => {
            // Handle dynamic actions with context awareness
            const actions = {
                summarize_thread: (p) => summarizeConversation(p, thread_ids),
                switch_agent: (p) => initiateAgentTransfer(p, thread_ids, context),
                save_profile: (p) => saveToUserProfile(p, context)
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

    // Context management functions
    function updateThreadContext(context) {
        if (!context) return;
        
        // Update local state
        window.threadContext = context;
        
        // Emit context update event
        window.dispatchEvent(new CustomEvent('thread-context-update', { 
            detail: context 
        }));
    }

    async function loadThreadHistory(thread_ids) {
        try {
            // Load messages from all platforms
            const [openaiHistory, storylineHistory] = await Promise.all([
                thread_ids.openai ? fetchOpenAIHistory(thread_ids.openai) : [],
                thread_ids.storyline ? fetchStorylineHistory(thread_ids.storyline) : []
            ]);
            
            // Merge and sort by timestamp
            const allMessages = [...openaiHistory, ...storylineHistory]
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                
            // Render in chat
            allMessages.forEach(msg => {
                addMessageToChat(msg.content, msg.role, msg.metadata);
            });
        } catch (error) {
            console.error('Failed to load thread history:', error);
            showNotification("Could not load complete history", "warning");
        }
    }

    async function initializeAgent(agentId, config, thread_ids) {
        // Store agent config
        window.currentAgent = {
            id: agentId,
            config: config,
            thread_ids: thread_ids
        };
        
        // Initialize platform-specific components
        if (thread_ids.openai) {
            await initializeOpenAIAgent(agentId, config);
        }
        if (thread_ids.storyline) {
            await initializeStorylineAgent(config);
        }
    }

    // Usage in message handler
    async function handleMessage(message) {
        const currentContext = window.threadContext || {};
        const thread_ids = window.currentAgent?.thread_ids || {
            openai: null,
            storyline: null
        };
        
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    thread_ids,
                    context: currentContext,
                    metadata: {
                        source: 'web_chat',
                        timestamp: new Date().toISOString()
                    }
                })
            });
            
            const data = await response.json();
            
            // Update thread IDs and context
            if (data.thread_ids) {
                window.currentAgent = {
                    ...window.currentAgent,
                    thread_ids: data.thread_ids
                };
            }
            if (data.context) {
                updateThreadContext(data.context);
            }
            
            // Handle response
            if (ResponseHandler[data.status]) {
                await ResponseHandler[data.status](data);
            }
        } catch (error) {
            console.error('Message handling failed:', error);
            showNotification("Failed to process message", "error");
        }
    }

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