// Test payload sender
async function sendTestPayload() {
    // Production webhook URL
    const MAKE_WEBHOOK = 'https://hook.us1.make.com/huu6kvcj6t6eenynbx4t79c3wa8evfsg';
    
    const testPayload = {
        // User Context
        user: {
            User_ID: 'rec9WdT6Ppi9HsZ6J',
            Org_ID: 'recjUGiOT65lwgBtm',
            Thread_ID: `thread_${Date.now()}`,
            session_start: new Date().toISOString(),
            role: 'parent',
            type: 'community_member'
        },

        // Chat Context
        chat: {
            interaction_type: 'health_support',
            status: '200',
            source: 'pre_auth_chat',
            save_to_org: true,
            manual_save: false,
            requires_safety_scan: false
        },

        // Message Data
        messages: [
            {
                role: 'user',
                content: 'I need help finding maternal health resources in Baltimore',
                created_at: new Date().toISOString(),
                message_type: 'initial_request'
            }
        ],

        // URL Context
        url_context: {
            origin: 'https://bmore.softr.app',
            path: '/maternal-health',
            referrer: 'https://bmore.softr.app/user-intake',
            app_platform: 'softr',
            app_name: 'bmore'
        }
    };

    try {
        console.log('🚀 Sending test payload to Make webhook...');
        
        const response = await fetch(MAKE_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testPayload)
        });

        const text = await response.text();
        console.log('✅ Response:', text);
        
        return {
            success: response.ok,
            message: text
        };

    } catch (error) {
        console.error('❌ Request failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Run the test
sendTestPayload()
    .then(result => {
        if (result.success) {
            console.log('🎉 Test completed successfully!');
        } else {
            console.error('❌ Test failed!');
        }
    }); 