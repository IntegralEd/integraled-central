#!/usr/bin/env node

/**
 * Test runner for chat interactions
 * Run with: ./test/test-interactions.js
 * or: 
 * npm test
 */

const { logChatInteraction, sendToMake } = require('../lambda-deploy/make-integration.js');

async function runSequentialTests() {
    console.log('🔄 Starting sequential interaction tests...\n');
    
    const testContext = {
        User_ID: 'rec9WdT6Ppi9HsZ6J',
        Org_ID: 'recjUGiOT65lwgBtm',
        Thread_ID: null,
        timestamp: new Date().toISOString()
    };

    try {
        // Test 1: Initialize Chat
        console.log('📝 Test 1: Initialize Chat Session');
        const initResult = await logChatInteraction({
            ...testContext,
            interaction_type: 'init',
            status: '220'
        });
        console.log('✅ Init Result:', initResult);
        testContext.Thread_ID = initResult.thread_id;

        // Test 2: Send First Message
        console.log('\n📝 Test 2: Send First Message');
        const messageResult = await sendToMake({
            webhookUrl: 'https://hook.us1.make.com/q5affda3x5n8fqp3q7vwdmeyr9apthfr',
            threadId: testContext.Thread_ID,
            userId: testContext.User_ID,
            organization: testContext.Org_ID,
            messages: [{
                role: 'user',
                content: 'I need help with maternal health resources',
                created_at: Date.now()
            }]
        });
        console.log('✅ Message Result:', messageResult);

        // Test 3: Create Support Ticket
        console.log('\n📝 Test 3: Create Support Ticket');
        const ticketResult = await logChatInteraction({
            ...testContext,
            interaction_type: 'support_ticket',
            status: '300'
        });
        console.log('✅ Ticket Result:', ticketResult);

        // Test user not found scenario
        const testNotFound = {
            User_ID: 'unknown_user_123',
            Org_ID: 'recjUGiOT65lwgBtm',
            Thread_ID: 'thread_test123',
            interaction_type: 'chat',
            status: '130'
        };

        const result = await logChatInteraction(testNotFound);
        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('❌ Test sequence failed:', error);
        process.exit(1);
    }
}

// Add to package.json scripts
if (require.main === module) {
    runSequentialTests()
        .then(() => console.log('\n✨ All tests completed'))
        .catch(console.error);
}

module.exports = { runSequentialTests }; 