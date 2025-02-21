// Get user namespace from Softr
export const getUserNamespace = () => {
  // We'll get this from Softr's user context
  const userId = window.softr.user?.id;
  return userId ? `user_${userId}` : 'default';
}; 