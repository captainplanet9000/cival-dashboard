/**
 * API Inspector for debugging and monitoring API requests
 * Provides a developer-friendly interface for inspecting API calls
 */

// Store a limited number of request logs
const MAX_REQUEST_LOGS = 100;

// Request log structure
export interface RequestLog {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  timestamp: number;
  duration?: number;
  status?: number;
  response?: any;
  error?: Error;
  service?: string;
  endpoint?: string;
}

/**
 * API Inspector Class
 * Captures and provides tools to inspect API requests and responses
 */
export class ApiInspector {
  private static instance: ApiInspector;
  private requests: RequestLog[] = [];
  private isEnabled: boolean = false;
  private storageKey: string = 'api_inspector_enabled';
  private listeners: Array<(log: RequestLog) => void> = [];
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    // Check if inspector is enabled in localStorage
    this.isEnabled = localStorage?.getItem(this.storageKey) === 'true';
    
    // Only enable in development by default
    if (typeof localStorage !== 'undefined' && process.env.NODE_ENV === 'development') {
      this.isEnabled = true;
    }
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ApiInspector {
    if (!ApiInspector.instance) {
      ApiInspector.instance = new ApiInspector();
    }
    return ApiInspector.instance;
  }
  
  /**
   * Enable the API inspector
   */
  public enable(): void {
    this.isEnabled = true;
    localStorage?.setItem(this.storageKey, 'true');
  }
  
  /**
   * Disable the API inspector
   */
  public disable(): void {
    this.isEnabled = false;
    localStorage?.setItem(this.storageKey, 'false');
  }
  
  /**
   * Toggle the API inspector state
   * 
   * @returns New enabled state
   */
  public toggle(): boolean {
    this.isEnabled = !this.isEnabled;
    localStorage?.setItem(this.storageKey, this.isEnabled ? 'true' : 'false');
    return this.isEnabled;
  }
  
  /**
   * Check if the inspector is enabled
   */
  public isInspectorEnabled(): boolean {
    return this.isEnabled;
  }
  
  /**
   * Capture a request for inspection
   * 
   * @param request Request data to log
   */
  public captureRequest(request: Omit<RequestLog, 'id' | 'timestamp'>): string {
    // Skip if disabled
    if (!this.isEnabled) {
      return '';
    }
    
    const id = this.generateRequestId();
    const timestamp = Date.now();
    
    const requestLog: RequestLog = {
      ...request,
      id,
      timestamp
    };
    
    // Add to request logs
    this.requests.unshift(requestLog);
    
    // Trim logs if needed
    if (this.requests.length > MAX_REQUEST_LOGS) {
      this.requests = this.requests.slice(0, MAX_REQUEST_LOGS);
    }
    
    // Notify listeners
    this.notifyListeners(requestLog);
    
    // Log to console if in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`📡 API Request: ${request.method} ${request.url}`);
      console.log('Headers:', request.headers);
      if (request.body) {
        console.log('Body:', request.body);
      }
      console.log('Timestamp:', new Date(timestamp).toISOString());
      console.groupEnd();
    }
    
    return id;
  }
  
  /**
   * Update a request with response data
   * 
   * @param id Request ID
   * @param response Response data
   * @param error Error if request failed
   */
  public captureResponse(id: string, status: number, response: any, error?: Error): void {
    // Skip if disabled
    if (!this.isEnabled) {
      return;
    }
    
    // Find request by ID
    const requestIndex = this.requests.findIndex(req => req.id === id);
    if (requestIndex === -1) {
      return;
    }
    
    // Update request with response data
    const request = this.requests[requestIndex];
    const duration = Date.now() - request.timestamp;
    
    const updatedRequest: RequestLog = {
      ...request,
      status,
      response,
      error,
      duration
    };
    
    this.requests[requestIndex] = updatedRequest;
    
    // Notify listeners
    this.notifyListeners(updatedRequest);
    
    // Log to console if in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🔄 API Response: ${request.method} ${request.url}`);
      console.log('Status:', status);
      console.log('Duration:', `${duration}ms`);
      if (error) {
        console.error('Error:', error);
      } else {
        console.log('Response:', response);
      }
      console.groupEnd();
    }
  }
  
  /**
   * Get all request logs
   */
  public getLogs(): RequestLog[] {
    return [...this.requests];
  }
  
  /**
   * Clear all request logs
   */
  public clearLogs(): void {
    this.requests = [];
  }
  
  /**
   * Get a specific request log by ID
   * 
   * @param id Request ID
   */
  public getLogById(id: string): RequestLog | undefined {
    return this.requests.find(req => req.id === id);
  }
  
  /**
   * Add a listener for new request logs
   * 
   * @param listener Callback function
   */
  public addListener(listener: (log: RequestLog) => void): void {
    this.listeners.push(listener);
  }
  
  /**
   * Remove a listener
   * 
   * @param listener Callback function to remove
   */
  public removeListener(listener: (log: RequestLog) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }
  
  /**
   * Notify all listeners about a request log
   * 
   * @param log Request log
   */
  private notifyListeners(log: RequestLog): void {
    this.listeners.forEach(listener => {
      try {
        listener(log);
      } catch (error) {
        console.error('Error in API inspector listener:', error);
      }
    });
  }
  
  /**
   * Export logs to JSON
   */
  public exportLogs(): string {
    return JSON.stringify(this.requests, null, 2);
  }
  
  /**
   * Download logs as JSON file
   */
  public downloadLogs(): void {
    const json = this.exportLogs();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
} 