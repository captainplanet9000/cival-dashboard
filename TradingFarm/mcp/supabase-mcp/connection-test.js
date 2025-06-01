const { createClient } = require('@supabase/supabase-js');

// Supabase credentials
const supabaseUrl = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';

console.log(`Testing connection to Supabase at: ${supabaseUrl}`);

// Initialize the Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to check connection
async function checkConnection() {
  try {
    // Try to get information about the database
    console.log('Querying database tables...');
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5);
    
    if (error) {
      throw error;
    }
    
    console.log('Connection successful! ✅');
    console.log('Tables found:', data.map(t => t.table_name).join(', '));
    
    // Try to get farms if they exist
    console.log('\nChecking for farms table...');
    const { data: farms, error: farmsError } = await supabase
      .from('farms')
      .select('*')
      .limit(3);
    
    if (farmsError) {
      console.log('Could not query farms table:', farmsError.message);
    } else {
      console.log(`Found ${farms.length} farms in the database`);
      if (farms.length > 0) {
        console.log('Sample farm data:', JSON.stringify(farms[0], null, 2));
      }
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Connection failed! ❌');
    console.error('Error details:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the connection test
checkConnection()
  .then(() => {
    console.log('\nConnection test complete.');
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });
