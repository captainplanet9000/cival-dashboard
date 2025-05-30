/**
 * Supabase Mock API
 * Provides mock implementation for Supabase API calls used in tests
 */

type MockApiHandler = {
  respond: (fn: (...args: any[]) => any) => MockHandlerObject;
};

type MockHandlerObject = {
  select: (...args: any[]) => MockApiHandler;
  eq: (...args: any[]) => MockApiHandler;
  update: (...args: any[]) => MockApiHandler;
  insert: (...args: any[]) => MockApiHandler;
  delete: (...args: any[]) => MockApiHandler;
  single: () => MockApiHandler;
  maybeSingle: () => MockApiHandler;
  match: (...args: any[]) => MockApiHandler;
  respond: (fn: (...args: any[]) => any) => MockHandlerObject;
};

/**
 * Creates a mock API handler with chainable methods
 */
const createMockHandler = (): MockApiHandler => {
  const handler: Partial<MockApiHandler & MockHandlerObject> = {};
  const responseHandlers: Record<string, (...args: any[]) => any> = {};
  let currentArgs: Record<string, any> = {};

  const methods = [
    'select', 'eq', 'update', 'insert', 'delete', 'single', 
    'maybeSingle', 'match', 'on', 'from', 'auth'
  ];

  methods.forEach(method => {
    handler[method as keyof typeof handler] = (...args: any[]) => {
      currentArgs[method] = args;
      return handler as MockApiHandler & MockHandlerObject;
    };
  });

  handler.respond = (fn) => {
    responseHandlers[Object.keys(currentArgs).join('.')] = fn;
    // Reset current args for next chain
    currentArgs = {};
    return handler as MockHandlerObject;
  };

  return handler as MockApiHandler;
};

// Create the mockApi object
export const mockApi = {
  from: () => createMockHandler(),
  on: (path: string) => createMockHandler(),
  auth: () => createMockHandler()
};

// Create mock Supabase client
export const createMockSupabaseClient = () => {
  return {
    from: (table: string) => createMockHandler(),
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'test-user-id', email: 'test@example.com' } } }),
      signOut: () => Promise.resolve({ error: null }),
      signInWithPassword: () => Promise.resolve({ data: { session: {} }, error: null }),
      onAuthStateChange: (callback: () => void) => {
        // Mock auth state change
        return { data: { subscription: { unsubscribe: () => {} } } };
      }
    },
    storage: {
      from: (bucket: string) => ({
        upload: () => Promise.resolve({ data: {}, error: null }),
        download: () => Promise.resolve({ data: new Blob(), error: null })
      })
    }
  };
};
