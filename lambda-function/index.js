const AWS = require('aws-sdk');

// Define CORS headers once
const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Accept',
    'Access-Control-Max-Age': '86400'
};

exports.handler = async (event) => {
    // Configure AWS SDK
    AWS.config.update({
        region: 'us-east-2'  // Make sure this matches your Lambda region
    });

    // Add debug logging
    console.log('Request received:', {
        method: event.requestContext?.http?.method,
        headers: event.headers,
        origin: event.headers?.origin || event.headers?.Origin
    });

    // Handle OPTIONS preflight
    if (event.requestContext?.http?.method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Preflight OK' })
        };
    }

    try {
        const ssm = new AWS.SSM();
        const [urlParam, apiKeyParam, indexNameParam] = await Promise.all([
            ssm.getParameter({
                Name: '/rag-bmore/prod/config/pinecone_url',
                WithDecryption: false
            }).promise(),
            ssm.getParameter({
                Name: '/rag-bmore/prod/secrets/PINECONE_API_KEY',
                WithDecryption: true
            }).promise(),
            ssm.getParameter({
                Name: '/rag-bmore/prod/config/pinecone_index',
                WithDecryption: false
            }).promise()
        ]);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                pinecone_url: urlParam.Parameter.Value,
                pinecone_api_key: apiKeyParam.Parameter.Value,
                pinecone_index: indexNameParam.Parameter.Value
            })
        };
    } catch (error) {
        console.error('Lambda error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Failed to fetch configuration',
                details: error.message,
                type: error.name
            })
        };
    }
}; 