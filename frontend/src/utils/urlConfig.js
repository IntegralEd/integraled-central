export const buildAppUrl = (clientId, params = {}) => {
  // Base configuration for different environments
  const config = {
    production: {
      bmore: 'integraled.github.io/rag-bmore',
      // Add other clients as needed
    },
    staging: {
      bmore: 'integraled.github.io/rag-bmore-staging',
    }
  };

  // Get environment from build/runtime config
  const env = process.env.NODE_ENV || 'production';
  const baseUrl = config[env][clientId];

  // Build URL with required parameters
  const url = new URL(`https://${baseUrl}`);
  
  // Add required parameters
  const requiredParams = {
    ...params,
    client: clientId,
    v: process.env.APP_VERSION || '1.0.0' // Version control
  };

  // Add all parameters to URL
  Object.entries(requiredParams).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, value);
  });

  return url.toString();
}; 