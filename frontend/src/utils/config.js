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
    
    // Validate all required fields are present
    const requiredFields = [
      'pinecone_url',
      'pinecone_api_key',
      'pinecone_index',
      'openai_api_key',
      'openai_org_id',
      'openai_project_id'
    ];
    
    const missingFields = requiredFields.filter(field => !config[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    return {
      pinecone_url: config.pinecone_url,
      pinecone_api_key: config.pinecone_api_key,
      pinecone_index: config.pinecone_index,
      openai_api_key: config.openai_api_key,
      openai_org_id: config.openai_org_id,
      openai_project_id: config.openai_project_id
    };
  } catch (error) {
    console.error('Failed to get config:', error);
    throw error;
  }
}; 