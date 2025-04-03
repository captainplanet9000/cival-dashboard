
    const fs = require('fs');
    const supabase = require('@supabase/supabase-js');
    
    // Load the SQL file
    const sqlContent = fs.readFileSync('./tables-setup.sql', 'utf8');
    
    // Create a Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    
    async function executeSql() {
      console.log('📊 Executing SQL to set up database tables...');
      
      try {
        // Split the SQL into individual statements by semicolon
        const statements = sqlContent
          .split(';')
          .map(statement => statement.trim())
          .filter(statement => statement.length > 0);
        
        // Execute each statement
        for (const statement of statements) {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          await supabaseClient.rpc('execute_sql', { sql: statement + ';' });
        }
        
        console.log('✅ Database tables created successfully!');
      } catch (error) {
        console.error('❌ Error executing SQL:', error);
      }
    }
    
    executeSql();
    