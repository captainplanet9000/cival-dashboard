/**
 * Client-side wrapper for the Supabase MCP server
 * Use this in your Trading Farm dashboard to connect to the MCP server
 */

class SupabaseMCPClient {
  constructor(url = 'ws://localhost:3500') {
    this.url = url;
    this.socket = null;
    this.connected = false;
    this.callbacks = new Map();
    this.messageQueue = [];
    this.requestId = 1;
    this.connectionPromise = null;
    this.connectionResolver = null;
    this.eventListeners = new Map();
  }

  connect() {
    if (this.connected) return Promise.resolve(true);
    
    if (this.connectionPromise) return this.connectionPromise;
    
    this.connectionPromise = new Promise((resolve) => {
      this.connectionResolver = resolve;
      
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = () => {
        console.log('Connected to Supabase MCP Server');
        this.connected = true;
        
        // Process any queued messages
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift();
          this._sendMessage(message);
        }
        
        this._emitEvent('connected');
        this.connectionResolver(true);
      };
      
      this.socket.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          
          if (response.requestId && this.callbacks.has(response.requestId)) {
            const callback = this.callbacks.get(response.requestId);
            this.callbacks.delete(response.requestId);
            callback(response);
          }
          
          this._emitEvent('message', response);
          
          // Emit tool-specific events
          if (response.tool) {
            this._emitEvent(`tool:${response.tool}`, response);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };
      
      this.socket.onclose = () => {
        console.log('Disconnected from Supabase MCP Server');
        this.connected = false;
        this._emitEvent('disconnected');
        this.connectionPromise = null;
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this._emitEvent('error', error);
      };
    });
    
    return this.connectionPromise;
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
  
  _sendMessage(message) {
    if (this.connected) {
      this.socket.send(JSON.stringify(message));
      return true;
    } else {
      this.messageQueue.push(message);
      this.connect();
      return false;
    }
  }
  
  _emitEvent(eventName, data) {
    if (this.eventListeners.has(eventName)) {
      this.eventListeners.get(eventName).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${eventName} event handler:`, error);
        }
      });
    }
  }
  
  on(eventName, callback) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    
    this.eventListeners.get(eventName).push(callback);
    
    return () => {
      const listeners = this.eventListeners.get(eventName);
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    };
  }
  
  async callTool(tool, params = {}) {
    await this.connect();
    
    return new Promise((resolve) => {
      const requestId = this.requestId++;
      
      this.callbacks.set(requestId, (response) => {
        resolve(response);
      });
      
      this._sendMessage({
        type: 'tool_call',
        requestId,
        tool,
        params
      });
    });
  }
  
  // Convenience methods for common operations
  
  async checkConnection() {
    return this.callTool('check_connection');
  }
  
  async getTables() {
    return this.callTool('get_tables');
  }
  
  async getTableSchema(table) {
    return this.callTool('get_table_schema', { table });
  }
  
  async select(tableName, options = {}) {
    return this.callTool('query_table', {
      operation: 'select',
      tableName,
      data: options
    });
  }
  
  async insert(tableName, values) {
    return this.callTool('query_table', {
      operation: 'insert',
      tableName,
      data: { values }
    });
  }
  
  async update(tableName, values, match) {
    return this.callTool('query_table', {
      operation: 'update',
      tableName,
      data: { values, match }
    });
  }
  
  async delete(tableName, match) {
    return this.callTool('query_table', {
      operation: 'delete',
      tableName,
      data: { match }
    });
  }
  
  // Farm-specific convenience methods for Trading Farm
  
  async getFarms(options = {}) {
    return this.select('farms', options);
  }
  
  async getAgents(options = {}) {
    return this.select('agents', options);
  }
  
  async getStrategies(options = {}) {
    return this.select('strategies', options);
  }
  
  async createFarm(farmData) {
    return this.insert('farms', farmData);
  }
  
  async updateFarm(id, farmData) {
    return this.update('farms', farmData, { id });
  }
  
  async createAgent(agentData) {
    return this.insert('agents', agentData);
  }
  
  async updateAgent(id, agentData) {
    return this.update('agents', agentData, { id });
  }
}

// For Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SupabaseMCPClient;
}

// For browser environments
if (typeof window !== 'undefined') {
  window.SupabaseMCPClient = SupabaseMCPClient;
}
