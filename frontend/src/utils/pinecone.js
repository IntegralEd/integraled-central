import { getConfig } from './config';

export const queryPinecone = async (query, userNamespace) => {
  try {
    const config = await getConfig();
    console.log('Pinecone config:', {
      url: config.pinecone_url.trim(),
      index: config.PINECONE_INDEX_NAME
    });

    // Construct proper URL with index name
    const pineconeUrl = `${config.pinecone_url.trim()}/${config.PINECONE_INDEX_NAME}/query`;
    console.log('Attempting Pinecone query at:', pineconeUrl);
    
    // Query both default and user namespaces
    try {
      const defaultResponse = await fetch(pineconeUrl, {
        method: 'POST',
        headers: {
          'Api-Key': config.PINECONE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          namespace: 'default',
          topK: 3,
          includeMetadata: true,
          vector: query,
        })
      });
      
      console.log('Default namespace response:', defaultResponse.status);
      const defaultResults = await defaultResponse.json();
      console.log('Default results:', defaultResults);

      const userResponse = await fetch(pineconeUrl, {
        method: 'POST',
        headers: {
          'Api-Key': config.PINECONE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          namespace: userNamespace,
          topK: 2,
          includeMetadata: true,
          vector: query,
        })
      });
      
      console.log('User namespace response:', userResponse.status);
      const userResults = await userResponse.json();
      console.log('User results:', userResults);

      // Combine and deduplicate results
      const allMatches = [
        ...(defaultResults.matches || []),
        ...(userResults.matches || [])
      ];

      return {
        matches: allMatches,
        namespaces: {
          default: defaultResults.matches?.length || 0,
          user: userResults.matches?.length || 0
        }
      };

    } catch (fetchError) {
      console.error('Fetch error details:', {
        message: fetchError.message,
        stack: fetchError.stack,
        url: pineconeUrl
      });
      throw fetchError;
    }

  } catch (error) {
    console.error('Pinecone query error:', error);
    throw error;
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