import { runMigration } from '@/utils/mcp/run-migration';

async function main() {
  try {
    console.log('Running initial schema migration...');
    await runMigration('001_initial_schema.sql');
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main(); 