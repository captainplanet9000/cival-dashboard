# Supabase Environment Setup for Trading Farm

## Environment Variables

Create a `.env.local` file in the root directory with these variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://bgvlzvswzpfoywfxehis.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgzMTU1OSwiZXhwIjoyMDUyNDA3NTU5fQ.TZLKwHuMxv9xtSc0wJ7DG5ivjw0K-7NztPeLRsGqMAA
```

## Setup Steps

### 1. Database Schema Setup

Execute the migration SQL directly in the Supabase SQL editor:

1. Go to the [Supabase Dashboard](https://supabase.com/dashboard/project/bgvlzvswzpfoywfxehis)
2. Navigate to the SQL Editor
3. Create a new query
4. Copy and paste the SQL from `supabase/migrations/20250330_create_trading_farm_schema.sql`
5. Run the query to set up your schema

### 2. TypeScript Integration

The `database.types.ts` file has been created for you with the expected schema types.

### 3. MCP Configuration

Use the `supabase-mcp-ready.json` file as your MCP configuration:

```json
{
  "project_id": "bgvlzvswzpfoywfxehis",
  "api_url": "https://bgvlzvswzpfoywfxehis.supabase.co",
  "service_role_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgzMTU1OSwiZXhwIjoyMDUyNDA3NTU5fQ.TZLKwHuMxv9xtSc0wJ7DG5ivjw0K-7NztPeLRsGqMAA",
  "anon_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU",
  "connection_method": "api",
  "mcp_parameters": {
    "timeoutMs": 60000,
    "retryAttempts": 3,
    "debug": true
  }
}
```

### 4. Client Usage Examples

#### Browser Client (Client Components)

```typescript
import { createBrowserClient } from '@/utils/supabase/client';

export default function ClientComponent() {
  const supabase = createBrowserClient();
  
  // Example query
  async function loadFarms() {
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .limit(10);
      
    if (error) {
      console.error('Error loading farms:', error);
      return;
    }
    
    // Use the farms data...
    console.log('Farms:', data);
  }
  
  // Rest of component...
}
```

#### Server Client (Server Components)

```typescript
import { createServerClient } from '@/utils/supabase/server';

export default async function ServerComponent() {
  const supabase = await createServerClient();
  
  // Example query
  const { data, error } = await supabase
    .from('farms')
    .select('*')
    .limit(10);
    
  if (error) {
    console.error('Error loading farms:', error);
    return <div>Error loading farms</div>;
  }
  
  // Render the farms data
  return (
    <div>
      <h1>Farms</h1>
      <ul>
        {data.map(farm => (
          <li key={farm.id}>{farm.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Verification

Verify your connection by running the test script:

```bash
npx tsx src/tests/test-supabase-connection.ts
```

This will confirm your database connection and schema setup.
