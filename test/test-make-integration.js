/**
 * Manual test script for Make integration
 * Run with: node test/test-make-integration.js
 */

// Import required modules
const makeIntegration = require('../lambda-deploy/make-integration');
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");

// Initialize SSM client
const ssmClient = new SSMClient({ region: "us-east-2" });

// Mock event object similar to what Lambda would receive
const mockEvent = {
  body: JSON.stringify({
    message: "How do I find prenatal care in Baltimore?",
    User_ID: "test_user_123",
    Organization: "IntegralEd"
  }),
  headers: {
    referer: "https://bmore.softr.app/maternal-health"
  },
  queryStringParameters: {
    role: "teacher",
    Name: "Test User"
  }
};

// Mock thread ID
const mockThreadId = "thread_" + Date.now();

// Mock messages
const mockMessages = [
  {
    role: "user",
    content: [{ type: "text", text: { value: "How do I find prenatal care in Baltimore?" } }],
    created_at: Date.now() - 60000
  },
  {
    role: "assistant",
    content: [{ type: "text", text: { value: "There are several resources for prenatal care in Baltimore..." } }],
    created_at: Date.now() - 30000
  }
];

/**
 * Get webhook URL from Parameter Store
 * @returns {Promise<string>} - Make webhook URL
 */
async function getMakeWebhookUrl() {
  try {
    console.log("🔑 Retrieving Make webhook URL from Parameter Store...");
    
    const response = await ssmClient.send(new GetParameterCommand({
      Name: '/rag-bmore/prod/config/MAKE_WEBHOOK_URL',
      WithDecryption: true
    }));
    
    console.log("✅ Successfully retrieved webhook URL from Parameter Store");
    return response.Parameter.Value;
  } catch (error) {
    console.warn("⚠️ Error retrieving webhook URL from Parameter Store:", error.message);
    console.log("⚠️ Falling back to environment variable or default webhook URL");
    
    // Fall back to environment variable or hardcoded default
    return process.env.MAKE_WEBHOOK_URL || null;
  }
}

// Test functions
async function runTests() {
  console.log("🧪 Testing Make integration module");
  
  // Get webhook URL from Parameter Store
  const webhookUrl = await getMakeWebhookUrl();
  
  if (!webhookUrl) {
    console.error("❌ No webhook URL available. Test cannot proceed.");
    console.log("Please ensure the webhook URL is set in Parameter Store or as an environment variable.");
    return;
  }
  
  // Test 1: Send to Make with webhook URL from Parameter Store
  console.log("\n📋 Test: Send to Make");
  try {
    const result = await makeIntegration.sendConversationToMake(
      mockEvent, 
      mockThreadId, 
      mockMessages, 
      webhookUrl
    );
    console.log("Result:", result);
  } catch (error) {
    console.error("Error:", error);
  }
  
  console.log("\n✅ Test completed");
}

// Run the tests
runTests().catch(error => {
  console.error("❌ Test failed:", error);
}); 