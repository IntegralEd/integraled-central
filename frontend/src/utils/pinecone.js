export const queryPinecone = async (query, namespace) => {
  // Get config first
  const config = await getConfig();
  
  // Query vectors in specific namespace
  const pineconeUrl = `${config.pinecone_url}/${config.PINECONE_INDEX_NAME}/query`;
  
  const response = await fetch(pineconeUrl, {
    method: 'POST',
    headers: {
      'Api-Key': config.PINECONE_API_KEY,
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