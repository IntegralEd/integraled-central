// Basic Pinecone configuration
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;

export const queryPinecone = async (query, namespace) => {
  // Query vectors in specific namespace
  const response = await fetch(`https://${PINECONE_ENVIRONMENT}/query`, {
    method: 'POST',
    headers: {
      'Api-Key': PINECONE_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      namespace: namespace,
      topK: 3,
      includeMetadata: true,
      vector: query
    })
  });
  return response.json();
}; 