const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with hardcoded credentials as fallback
const supabaseUrl = process.env.SUPABASE_URL || 'https://bgvlzvswzpfoywfxehis.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';

console.log(`Connecting to Supabase at: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey);

// Create a function to handle table operations with error handling
async function queryTable(operation, tableName, data = {}) {
  try {
    let query;
    
    switch (operation) {
      case 'select':
        query = supabase.from(tableName).select(data.select || '*');
        
        // Apply filters if provided
        if (data.filters) {
          data.filters.forEach(filter => {
            if (filter.type === 'eq') {
              query = query.eq(filter.column, filter.value);
            } else if (filter.type === 'in') {
              query = query.in(filter.column, filter.value);
            } else if (filter.type === 'gt') {
              query = query.gt(filter.column, filter.value);
            } else if (filter.type === 'lt') {
              query = query.lt(filter.column, filter.value);
            } else if (filter.type === 'gte') {
              query = query.gte(filter.column, filter.value);
            } else if (filter.type === 'lte') {
              query = query.lte(filter.column, filter.value);
            } else if (filter.type === 'neq') {
              query = query.neq(filter.column, filter.value);
            } else if (filter.type === 'like') {
              query = query.like(filter.column, `%${filter.value}%`);
            }
          });
        }
        
        // Apply ordering if provided
        if (data.orderBy) {
          query = query.order(data.orderBy.column, { 
            ascending: data.orderBy.ascending 
          });
        }
        
        // Apply pagination if provided
        if (data.pagination) {
          query = query.range(
            data.pagination.from, 
            data.pagination.to
          );
        }
        
        break;
        
      case 'insert':
        query = supabase.from(tableName).insert(data.values);
        break;
        
      case 'update':
        query = supabase.from(tableName).update(data.values);
        
        // Apply match conditions
        if (data.match) {
          Object.entries(data.match).forEach(([column, value]) => {
            query = query.eq(column, value);
          });
        }
        break;
        
      case 'delete':
        query = supabase.from(tableName).delete();
        
        // Apply match conditions
        if (data.match) {
          Object.entries(data.match).forEach(([column, value]) => {
            query = query.eq(column, value);
          });
        }
        break;
        
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
    
    const result = await query;
    
    if (result.error) {
      throw result.error;
    }
    
    return { 
      success: true, 
      data: result.data, 
      count: result.count,
      status: result.status
    };
  } catch (error) {
    console.error(`Supabase ${operation} operation failed:`, error);
    return { 
      success: false, 
      error: error.message || 'Unknown error occurred',
      details: error.details || null,
      hint: error.hint || null,
      code: error.code || null
    };
  }
}

// Function to execute raw SQL queries (with caution)
async function executeRawQuery(query, params = []) {
  try {
    const result = await supabase.rpc('execute_sql', { 
      query_text: query,
      query_params: params
    });
    
    if (result.error) {
      throw result.error;
    }
    
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Raw SQL query failed:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error occurred',
      details: error.details || null
    };
  }
}

// Function to check if connected to Supabase
async function checkConnection() {
  try {
    // Try a simple query to check connection
    const { data, error } = await supabase.from('farms').select('count()', { count: 'exact' }).limit(1);
    
    if (error) {
      throw error;
    }
    
    return { connected: true, message: 'Successfully connected to Supabase' };
  } catch (error) {
    console.error('Supabase connection check failed:', error);
    return { connected: false, message: error.message || 'Failed to connect to Supabase' };
  }
}

module.exports = {
  supabase,
  queryTable,
  executeRawQuery,
  checkConnection
};
