#!/usr/bin/env node

const fetch = require('node-fetch');

const API_URL = process.env.API_URL || 'https://your-lambda-url.execute-api.us-east-2.amazonaws.com/prod';

async function testHandshake() {
    console.log('🤝 Testing handshake endpoint...');
    const response = await fetch(`${API_URL}/handshake`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log('Handshake response:', JSON.stringify(data, null, 2));
    return data;
}

async function testChat() {
    console.log('\n💬 Testing chat endpoint with math assistant...');
    
    const testEvent = {
        body: JSON.stringify({
            message: "I am here to set goals for 2nd grade math skills.",
            Assistant_ID: "asst_9GkHpGa5t50Yw74uzonh6FAz",
            User_ID: "test_user",
            Thread_ID: null
        }),
        requestContext: {
            http: {
                method: "POST"
            }
        }
    };

    console.log('Sending request with event:', JSON.stringify(testEvent, null, 2));

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(testEvent)
    });

    const data = await response.json();
    console.log('Chat response:', JSON.stringify(data, null, 2));
    
    if (!data.Thread_ID) {
        throw new Error('No Thread_ID in response');
    }
    
    return data;
}

async function testChatWithThread() {
    console.log('\n💬 Testing chat with existing thread...');
    
    const testEvent = {
        body: JSON.stringify({
            User_ID: "test_user",
            Assistant_ID: "asst_IA5PsJxdShVPTAv2xeXTr4Ma",
            Org_ID: "recjUGiOT65lwgBtm",
            message: "What was my last message?",
            Thread_ID: "thread_9EXuFwDLQgCvV4QIA5qm44q1"
        }),
        requestContext: {
            http: {
                method: "POST"
            }
        }
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(testEvent)
    });

    const data = await response.json();
    console.log('Chat with thread response:', JSON.stringify(data, null, 2));
    return data;
}

async function runTests() {
    try {
        await testHandshake();
        const chatResult = await testChat();
        await testChatWithThread();
        console.log('\n✨ All tests completed successfully');
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    runTests();
} 