// Get user namespace from Softr
export const getUserNamespace = () => {
  try {
    // Check if Softr user exists
    if (window.softr && window.softr.user) {
      // Use email as namespace (or fallback to ID)
      const namespace = window.softr.user.email || window.softr.user.id || 'default';
      console.log('User namespace:', namespace);
      return namespace;
    }
    
    console.warn('No Softr user found, using default namespace');
    return 'default';
  } catch (error) {
    console.warn('Auth error:', error);
    return 'default';
  }
}; 