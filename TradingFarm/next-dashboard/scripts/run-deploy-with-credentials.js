// Deployment script with embedded credentials
const { deployElizaIntegration } = require('./deploy-eliza-integration');

// Set environment variables programmatically
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://bgvlzvswzpfoywfxehis.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgzMTU1OSwiZXhwIjoyMDUyNDA3NTU5fQ.TZLKwHuMxv9xtSc0wJ7DG5ivjw0K-7NztPeLRsGqMAA';

// Run the deployment process
deployElizaIntegration().catch(error => {
  console.error('Deployment failed with error:', error);
  process.exit(1);
});
