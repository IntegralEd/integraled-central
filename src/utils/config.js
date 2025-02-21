// AWS Parameter Store configuration
export const getConfig = async () => {
  const response = await fetch('/api/config', {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return response.json();
}; 