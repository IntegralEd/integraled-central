const AWS = require('aws-sdk');

exports.handler = async (event) => {
    console.log("🔄 Received event:", event);
    
    // Configure AWS SDK
    AWS.config.update({
        region: 'us-east-2'
    });

    try {
        const ssm = new AWS.SSM();
        const [urlParam, apiKeyParam, indexNameParam, openaiKeyParam] = await Promise.all([
            ssm.getParameter({
                Name: '/rag-bmore/prod/config/pinecone_url',
                WithDecryption: false
            }).promise(),
            ssm.getParameter({
                Name: '/rag-bmore/prod/secrets/PINECONE_API_KEY',
                WithDecryption: true
            }).promise(),
            ssm.getParameter({
                Name: '/rag-bmore/prod/config/PINECONE_INDEX_NAME',
                WithDecryption: false
            }).promise(),
            ssm.getParameter({
                Name: '/rag-bmore/prod/secrets/OPENAI_API_KEY',
                WithDecryption: true
            }).promise()
        ]);

        return {
            statusCode: 200,
            body: JSON.stringify({
                pinecone_url: urlParam.Parameter.Value,
                pinecone_api_key: apiKeyParam.Parameter.Value,
                pinecone_index: indexNameParam.Parameter.Value,
                openai_api_key: openaiKeyParam.Parameter.Value
            })
        };
    } catch (error) {
        console.error('❌ Lambda error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Failed to fetch configuration',
                details: error.message,
                type: error.name
            })
        };
    }
}; 