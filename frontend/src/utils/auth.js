// Get user namespace from Softr
export const getUserNamespace = () => {
  try {
    // Check if Softr user exists and get email
    if (window.softr && window.softr.user) {
      // Use {LOGGED_IN_USER:Email} as namespace
      const namespace = window.softr.user.email || '{LOGGED_IN_USER:Email}';
      console.log('User namespace:', namespace);
      return namespace;
    }
    
    console.warn('No Softr user found, using default namespace');
    return '{LOGGED_IN_USER:Email}'; // This will be replaced by Softr with actual email
  } catch (error) {
    console.warn('Auth error:', error);
    return '{LOGGED_IN_USER:Email}';
  }
}; 