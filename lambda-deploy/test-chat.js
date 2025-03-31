const fetch = require('node-fetch');

const API_URL = 'https://tixnmh1pe8.execute-api.us-east-2.amazonaws.com/prod/IntegralEd-Main';

async function testNewUserChat() {
    console.log('\n=== Test 1: New User Chat (No Thread ID) ===');
    const testMessage = {
        message: "Hello, I'm a new user",
        User_ID: "test_user_" + Date.now()
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testMessage)
        });
        const data = await response.json();
        console.log('Response:', data);
        return { success: response.ok, threadId: data.thread_id };
    } catch (error) {
        console.error('Error:', error);
        return { success: false };
    }
}

async function testPreloadWithFormData() {
    console.log('\n=== Test 2: Preload with Form Data ===');
    const formData = {
        message: "I want to learn about mathematics",
        User_ID: "test_user_" + Date.now(),
        form_data: {
            subject: "Mathematics",
            level: "Beginner",
            goals: ["Learn basic algebra", "Understand calculus"]
        }
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const data = await response.json();
        console.log('Response:', data);
        return { success: response.ok, threadId: data.thread_id };
    } catch (error) {
        console.error('Error:', error);
        return { success: false };
    }
}

async function testContextBasedChat(threadId) {
    console.log('\n=== Test 3: Context-Based Chat ===');
    const contextMessage = {
        message: "Can you help me with algebra?",
        User_ID: "test_user_" + Date.now(),
        thread_id: threadId
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contextMessage)
        });
        const data = await response.json();
        console.log('Response:', data);
        return { success: response.ok, threadId: data.thread_id };
    } catch (error) {
        console.error('Error:', error);
        return { success: false };
    }
}

async function testExistingThreadChat(threadId) {
    console.log('\n=== Test 4: Existing Thread Chat ===');
    const existingThreadMessage = {
        message: "What was our last topic?",
        User_ID: "test_user_" + Date.now(),
        thread_id: threadId,
        Assistant_ID: "asst_abc123" // Replace with actual assistant ID
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(existingThreadMessage)
        });
        const data = await response.json();
        console.log('Response:', data);
        return response.ok;
    } catch (error) {
        console.error('Error:', error);
        return false;
    }
}

async function runAllTests() {
    console.log('Starting chat test sequence...\n');

    // Test 1: New User Chat
    const newUserResult = await testNewUserChat();
    if (!newUserResult.success) {
        console.log('Test 1 failed, stopping test sequence');
        return;
    }

    // Test 2: Preload with Form Data
    const preloadResult = await testPreloadWithFormData();
    if (!preloadResult.success) {
        console.log('Test 2 failed, stopping test sequence');
        return;
    }

    // Test 3: Context-Based Chat
    const contextResult = await testContextBasedChat(preloadResult.threadId);
    if (!contextResult.success) {
        console.log('Test 3 failed, stopping test sequence');
        return;
    }

    // Test 4: Existing Thread Chat
    const existingThreadResult = await testExistingThreadChat(contextResult.threadId);
    if (!existingThreadResult.success) {
        console.log('Test 4 failed');
        return;
    }

    console.log('\nAll tests completed successfully!');
}

// Run the test sequence
runAllTests().catch(console.error); 