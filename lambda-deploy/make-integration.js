/**
 * Make Integration for Baltimore Maternal Health Assistant
 * Handles sending conversation data to Make for Airtable storage
 */

/**
 * Extract all query parameters from URL
 * @param {string} url - Full URL string or query string
 * @returns {Object} - Object containing all query parameters
 */
function extractUrlParams(url) {
    try {
        const parsedUrl = url.includes('?') ? url : `?${url}`;
        const queryParams = new URLSearchParams(parsedUrl.split('?')[1]);
        const params = {};
        
        for (const [key, value] of queryParams.entries()) {
            params[key] = value;
        }
        
        return params;
    } catch (error) {
        console.warn('⚠️ Error extracting URL parameters:', error);
        return {};
    }
}

/**
 * Extract app name from referer URL
 * @param {string} referer - Referer URL from headers
 * @returns {Object} - Object with app platform and name
 */
function extractAppSource(referer) {
    try {
        if (!referer) return { platform: 'unknown', name: 'unknown' };
        
        const url = new URL(referer);
        
        // Extract Softr app name (subdomain)
        if (url.hostname.includes('softr.app')) {
            const subdomain = url.hostname.split('.')[0];
            return { platform: 'softr', name: subdomain };
        }
        
        // Extract Webflow site name
        if (url.hostname.includes('webflow.io')) {
            const siteName = url.hostname.split('.')[0];
            return { platform: 'webflow', name: siteName };
        }
        
        // Handle custom domains by extracting hostname
        return { 
            platform: 'custom', 
            name: url.hostname,
            fullUrl: url.origin
        };
    } catch (error) {
        console.warn('⚠️ Error extracting app source:', error);
        return { platform: 'unknown', name: 'unknown' };
    }
}

/**
 * Determine if conversation should be saved based on user role/type
 * @param {Object} userInfo - User information from URL params
 * @returns {Object} - Save settings including auto-save flags
 */
function determineConversationSaveSettings(userInfo) {
    // Extract user role/type information
    const userRole = userInfo.role || userInfo.user_role || userInfo.userRole || 'unknown';
    const userType = userInfo.type || userInfo.user_type || userInfo.userType || 'unknown';
    
    // Default settings
    const settings = {
        canSaveToOrg: false,         // Can user manually save?
        autoSaveToOrg: false,        // Should be auto-saved?
        requiresSafetyScan: false,   // Should be scanned for safety issues?
        userRole: userRole,
        userType: userType
    };
    
    // Determine settings based on user role/type
    // These are example rules - update according to your requirements
    if (userRole === 'admin' || userRole === 'teacher' || userRole === 'facilitator') {
        settings.canSaveToOrg = true;
        settings.autoSaveToOrg = true; // Auto-save all conversations for these roles
    } else if (userRole === 'parent' || userRole === 'guardian') {
        settings.canSaveToOrg = true;
        settings.autoSaveToOrg = false; // Parents can choose to save but not auto-saved
    } else if (userRole === 'student' || userType === 'student') {
        settings.canSaveToOrg = false; // Students cannot save
        settings.autoSaveToOrg = true; // But we auto-save for safety
        settings.requiresSafetyScan = true; // Enable safety scanning
    }
    
    return settings;
}

/**
 * Send conversation and metadata to Make webhook
 * @param {Object} options - Configuration options
 * @param {string} options.webhookUrl - Make webhook URL
 * @param {string} options.threadId - OpenAI thread ID
 * @param {string} options.userId - User ID from URL params
 * @param {string} options.organization - Organization from URL params
 * @param {Object} options.urlParams - All URL parameters
 * @param {Array} options.messages - Chat messages
 * @param {Object} options.appSource - Source app info (platform, name)
 * @param {Object} options.saveSettings - Save settings from determineConversationSaveSettings
 * @param {boolean} options.manualSave - Whether user manually requested to save
 * @returns {Promise<Object>} - Response from Make webhook
 */
async function sendToMake({
    webhookUrl,
    threadId,
    userId,
    organization,
    urlParams = {},
    messages = [],
    appSource = { platform: 'unknown', name: 'unknown' },
    saveSettings = {},
    manualSave = false
}) {
    if (!webhookUrl) {
        console.warn('⚠️ No Make webhook URL provided');
        return { success: false, error: "No webhook URL provided" };
    }
    
    console.log('📤 Preparing payload for Make webhook');
    
    // Determine if this conversation should be saved to the organization
    const shouldSaveToOrg = saveSettings.autoSaveToOrg || (saveSettings.canSaveToOrg && manualSave);
    
    // Create a structured payload with all available metadata
    const payload = {
        // Thread information
        thread_id: threadId,
        
        // User metadata
        user_id: userId,
        organization: organization || "unknown",
        
        // Organization saving context
        save_to_org: shouldSaveToOrg,
        manual_save: manualSave,
        user_role: saveSettings.userRole,
        user_type: saveSettings.userType,
        requires_safety_scan: saveSettings.requiresSafetyScan,
        can_save_to_org: saveSettings.canSaveToOrg,
        
        // URL parameters (all crumbs from URL)
        url_params: urlParams,
        
        // Context information
        app_platform: appSource.platform,
        app_name: appSource.name,
        app_url: appSource.fullUrl,
        timestamp: new Date().toISOString(),
        
        // Message data
        message_count: messages.length,
        messages: messages.map(m => ({
            role: m.role,
            content: formatMessageContent(m.content),
            created_at: m.created_at
        }))
    };
    
    try {
        console.log('🔄 Sending payload to Make webhook');
        console.log(`📋 Save settings: ${JSON.stringify({
            shouldSaveToOrg,
            manualSave,
            userRole: saveSettings.userRole
        })}`);
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Webhook responded with status: ${response.status}`);
        }
        
        // Try to parse response for any custom messages
        let responseData = {};
        try {
            responseData = await response.json();
        } catch (e) {
            // If not JSON, get text
            responseData = { message: await response.text() };
        }
        
        console.log('✅ Make webhook response:', response.status, responseData);
        
        return { 
            success: true, 
            status: response.status,
            data: responseData,
            savedToOrg: shouldSaveToOrg
        };
    } catch (error) {
        console.error('❌ Failed to send to Make webhook:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

/**
 * Format message content for consistent structure
 * @param {any} content - Message content in various formats
 * @returns {string} - Formatted content as string
 */
function formatMessageContent(content) {
    if (!content) return '';
    
    // Handle array format from Assistant API
    if (Array.isArray(content)) {
        return content
            .filter(c => c.type === 'text')
            .map(c => c.text?.value || '')
            .join(' ');
    }
    
    // Handle string content
    if (typeof content === 'string') {
        return content;
    }
    
    // Handle other formats
    return JSON.stringify(content);
}

/**
 * Prepare and send conversation data to Make
 * @param {Object} event - Lambda event containing request data
 * @param {string} threadId - OpenAI thread ID
 * @param {Array} messages - Thread messages
 * @param {string} webhookUrl - Make webhook URL 
 * @param {boolean} manualSave - Whether user manually requested to save
 * @returns {Promise<Object>} - Response status and message for user
 */
async function sendConversationToMake(event, threadId, messages, webhookUrl, manualSave = false) {
    // Extract user info from event
    const body = JSON.parse(event.body || '{}');
    const queryParams = event.queryStringParameters || {};
    
    // Get all URL parameters (from both body and query)
    const urlParams = {
        ...queryParams,
        ...extractUrlParams(event.rawQueryString || ''),
        // Include any passed from body
        ...(body.url_params || {})
    };
    
    // Extract key user identifiers
    const userId = body.User_ID || urlParams.User_ID || urlParams.user_id || 'anonymous';
    const organization = body.Organization || urlParams.Organization || urlParams.organization || 'unknown';
    
    // Get app source info from referer
    const referer = event.headers?.referer || event.headers?.Referer || '';
    const appSource = extractAppSource(referer);
    
    // Determine save settings based on user role/type
    const saveSettings = determineConversationSaveSettings(urlParams);
    
    // Send to Make
    const result = await sendToMake({
        webhookUrl,
        threadId,
        userId,
        organization,
        urlParams,
        messages,
        appSource,
        saveSettings,
        manualSave
    });
    
    // Prepare user-facing response based on save context
    if (result.success) {
        if (manualSave && result.savedToOrg) {
            return {
                success: true,
                message: result.data?.message || "Conversation saved to your organization"
            };
        } else if (manualSave && !result.savedToOrg) {
            return {
                success: true,
                message: "Conversation saved for your reference only"
            };
        } else {
            // Auto-save success
            return {
                success: true,
                message: result.data?.message || "Conversation processed successfully"
            };
        }
    } else {
        console.warn('⚠️ Failed to save conversation:', result.error);
        return {
            success: false,
            message: "Unable to process conversation at this time"
        };
    }
}

/**
 * Log chat interaction and create ticket if needed
 * @param {Object} params
 */
async function logChatInteraction({
    User_ID,
    Org_ID,
    Thread_ID,
    interaction_type = 'chat',
    status = '200'
}) {
    const baseWebhookUrl = 'https://hook.us1.make.com/q5affda3x5n8fqp3q7vwdmeyr9apthfr';
    
    // Basic payload structure
    const payload = {
        User_ID,
        Org_ID,
        Thread_ID,
        timestamp: new Date().toISOString(),
        interaction: {
            type: interaction_type,
            status: status,
            source: 'pre_auth_chat'
        }
    };

    // Sample ticket creation
    if (interaction_type === 'support_ticket') {
        payload.ticket = {
            title: "New Support Request",
            priority: "medium",
            category: "general_support",
            status: "new"
        };
    }

    try {
        const response = await fetch(baseWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        return await response.json();
    } catch (error) {
        console.error('Failed to log interaction:', error);
        return { error: 'Failed to log interaction' };
    }
}

module.exports = {
    sendToMake,
    sendConversationToMake,
    extractUrlParams,
    extractAppSource,
    determineConversationSaveSettings,
    logChatInteraction
}; 