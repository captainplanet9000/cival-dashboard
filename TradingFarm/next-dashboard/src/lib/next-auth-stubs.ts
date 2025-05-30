/**
 * Stub implementations for next-auth to allow building without the actual dependencies
 * These can be replaced with real implementations once the packages are installed
 */

export const getServerSession = async () => {
  console.log('getServerSession called (stub)');
  return {
    user: {
      id: 'stub-user-id',
      name: 'Stub User',
      email: 'stub@example.com',
      image: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
};

export const getSession = async () => {
  console.log('getSession called (stub)');
  return {
    user: {
      id: 'stub-user-id',
      name: 'Stub User',
      email: 'stub@example.com',
      image: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
};

export default {
  getServerSession,
  getSession,
};
