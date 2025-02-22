// AWS Parameter Store configuration
export const getConfig = async () => {
  try {
    // Call Lambda function URL
    const response = await fetch('https://lfx6tvyrslqyrpmhphy3bkbrza0clbxv.lambda-url.us-east-2.on.aws/', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      mode: 'cors'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${response.status}`);
    }

    const config = await response.json();
    return {
      pinecone_url: config.pinecone_url,
      PINECONE_API_KEY: config.pinecone_api_key
    };
  } catch (error) {
    console.error('Failed to get config:', error);
    throw error;
  }
}; 