// Get user namespace from Softr
export const getUserNamespace = () => {
  try {
    // Always return ns1 initially
    return 'ns1';
    
    // This code will be enabled later when we add the save feature
    /*
    if (window.pc_userEmail) {
      const namespace = window.pc_userEmail;
      console.log('Using pc_userEmail as namespace:', namespace);
      return namespace;
    }
    */
  } catch (error) {
    console.warn('Auth error:', error);
    return 'ns1';
  }
}; 