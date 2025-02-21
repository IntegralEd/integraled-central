// Get user namespace from Softr
export const getUserNamespace = () => {
  try {
    // Try to get namespace from window.pc_userEmail (set by Softr)
    if (window.pc_userEmail) {
      const namespace = window.pc_userEmail;
      console.log('Using pc_userEmail as namespace:', namespace);
      return namespace;
    }
    
    // Fallback to userId if email not available
    if (window.pc_userId) {
      const namespace = window.pc_userId;
      console.log('Using pc_userId as namespace:', namespace);
      return namespace;
    }
    
    console.warn('No user context found, using default namespace');
    return 'default';
  } catch (error) {
    console.warn('Auth error:', error);
    return 'default';
  }
}; 