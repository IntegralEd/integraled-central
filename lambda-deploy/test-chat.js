/**
 * Test suite for IntegralEd Lambda
 * Separates core Lambda functionality from async operations
 */

const fetch = require('node-fetch');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const API_URL = 'https://tixnmh1pe8.execute-api.us-east-2.amazonaws.com/prod/IntegralEd-Main';
const ssmClient = new SSMClient({ region: "us-east-2" });

/**
 * Core Lambda Function Tests
 * These tests verify the main Lambda functionality including:
 * - Preflight handling
 * - Assistant routing
 * - Streaming responses
 */
async function testCoreLambdaFunctionality() {
    console.log('\n=== Testing Core Lambda Functionality ===');
    
    // Test 1: Preflight Handling
    console.log('\n--- Test 1: Preflight Handling ---');
    try {
        const response = await fetch(API_URL, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'https://bmore.softr.app',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        });
        console.log('Preflight Status:', response.status);
        console.log('CORS Headers:', Object.fromEntries(response.headers));
        if (!response.ok) {
            throw new Error(`Preflight failed: ${response.status}`);
        }
    } catch (error) {
        console.error('Preflight Error:', error);
        return false;
    }

    // Test 2: Assistant Routing
    console.log('\n--- Test 2: Assistant Routing ---');
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
        console.log('Assistant Response:', data);
        if (!response.ok) {
            throw new Error(`Assistant routing failed: ${response.status}`);
        }
        return { success: true, threadId: data.thread_id };
    } catch (error) {
        console.error('Assistant Routing Error:', error);
        return { success: false };
    }
}

/**
 * Async Operations Tests
 * These tests verify the async operations for data capture
 */
async function testAsyncOperations(threadId) {
    console.log('\n=== Testing Async Operations ===');
    
    // Test 1: Airtable Integration
    console.log('\n--- Test 1: Airtable Integration ---');
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "Test message for async capture",
                User_ID: "test_user_" + Date.now(),
                thread_id: threadId,
                async_operation: "airtable"
            })
        });
        console.log('Airtable Integration Status:', response.status);
        if (!response.ok) {
            throw new Error(`Airtable integration failed: ${response.status}`);
        }
    } catch (error) {
        console.error('Airtable Integration Error:', error);
        return false;
    }

    // Test 2: Documentation Storage
    console.log('\n--- Test 2: Documentation Storage ---');
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "Test message for documentation",
                User_ID: "test_user_" + Date.now(),
                thread_id: threadId,
                async_operation: "documentation"
            })
        });
        console.log('Documentation Storage Status:', response.status);
        if (!response.ok) {
            throw new Error(`Documentation storage failed: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error('Documentation Storage Error:', error);
        return false;
    }
}

/**
 * Run the complete test suite
 */
async function runTestSuite() {
    console.log('Starting IntegralEd Lambda test suite...\n');

    // Test core Lambda functionality
    const coreResult = await testCoreLambdaFunctionality();
    if (!coreResult.success) {
        console.log('Core Lambda functionality tests failed');
        return;
    }

    // Test async operations
    const asyncResult = await testAsyncOperations(coreResult.threadId);
    if (!asyncResult) {
        console.log('Async operations tests failed');
        return;
    }

    console.log('\n✨ All tests completed successfully!');
}

// Run the test suite
runTestSuite().catch(console.error); 