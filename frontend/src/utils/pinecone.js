import { getConfig } from './config';

export const queryPinecone = async (query, userNamespace) => {
  try {
    const config = await getConfig();
    
    // First, get embedding from OpenAI
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openai_api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: query,
        model: "text-embedding-ada-002"
      })
    });

    if (!embeddingResponse.ok) {
      throw new Error(`OpenAI embedding failed: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const vector = embeddingData.data[0].embedding;

    // Then query Pinecone with the vector
    const pineconeUrl = `${config.pinecone_url}/query`;
    const response = await fetch(pineconeUrl, {
      method: 'POST',
      headers: {
        'Api-Key': config.pinecone_api_key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        namespace: userNamespace || 'ns1',  // Use provided namespace or default
        topK: 3,
        includeMetadata: true,
        vector: vector,
        includeValues: false
      })
    });

    if (!response.ok) {
      throw new Error(`Pinecone query failed: ${response.status}`);
    }

    const results = await response.json();
    console.log('Pinecone query results:', results);
    return results;
  } catch (error) {
    console.error('Search failed:', error);
    throw error; // Let the component handle the error
  }
};

// New function to store chat in user namespace
export const storeChatInPinecone = async (message, vector, userNamespace) => {
  try {
    const config = await getConfig();
    const pineconeUrl = `${config.pinecone_url.trim()}/vectors/upsert`;
    
    // Store only in user namespace
    const response = await fetch(pineconeUrl, {
      method: 'POST',
      headers: {
        'Api-Key': config.PINECONE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        namespace: userNamespace,
        vectors: [{
          id: `chat-${Date.now()}`,
          values: vector,
          metadata: {
            text: message,
            timestamp: new Date().toISOString(),
            type: 'chat_history'
          }
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to store chat: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Failed to store chat:', error);
    throw error;
  }
}; 