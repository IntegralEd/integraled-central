exports.handler = async (event) => {
    try {
        const ssm = new AWS.SSM();
        // ... existing parameter fetching code ...

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "https://app.softr.io", // Your Softr domain
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({
                pinecone_url: urlParam.Parameter.Value,
                pinecone_api_key: apiKeyParam.Parameter.Value
            })
        };
    } catch (error) {
        // ... error handling ...
    }
}; 