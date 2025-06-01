import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  apiService,
  strategyApiService,
  farmApiService,
  executionApiService,
  socketService
} from '../services/api';

// Context type
interface ApiContextType {
  isInitialized: boolean;
  isAuthenticated: boolean;
  apiToken: string | null;
  setApiToken: (token: string | null) => void;
}

// Create context with default values
const ApiContext = createContext<ApiContextType>({
  isInitialized: false,
  isAuthenticated: false,
  apiToken: null,
  setApiToken: () => {}
});

// Props for ApiProvider
interface ApiProviderProps {
  children: ReactNode;
  initialToken?: string | null;
  apiUrl?: string;
  socketUrl?: string;
}

/**
 * API Provider Component
 * Initializes API services and provides context for API state
 */
export const ApiProvider: React.FC<ApiProviderProps> = ({
  children,
  initialToken = null,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [apiToken, setApiToken] = useState<string | null>(initialToken);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize API services
  useEffect(() => {
    // Configure API service
    apiService.getInstance({
      baseURL: apiUrl,
      timeout: 30000
    });

    // Set token if available
    if (apiToken) {
      apiService.setToken(apiToken);
      setIsAuthenticated(true);
    }

    // Initialize socket service
    socketService.getInstance({
      url: socketUrl
    });

    setIsInitialized(true);
  }, [apiUrl, socketUrl, apiToken]);

  // Update token when it changes
  const handleSetApiToken = (token: string | null) => {
    if (token) {
      apiService.setToken(token);
      setIsAuthenticated(true);
    } else {
      apiService.clearToken();
      setIsAuthenticated(false);
    }
    
    setApiToken(token);
  };

  // Context value
  const contextValue: ApiContextType = {
    isInitialized,
    isAuthenticated,
    apiToken,
    setApiToken: handleSetApiToken
  };

  return (
    <ApiContext.Provider value={contextValue}>
      {children}
    </ApiContext.Provider>
  );
};

/**
 * Hook to use the API context
 */
export const useApiContext = () => useContext(ApiContext);

/**
 * Export individual API services
 */
export {
  apiService,
  strategyApiService,
  farmApiService,
  executionApiService,
  socketService
}; 