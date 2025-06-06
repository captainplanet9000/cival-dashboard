const { spawnSync } = require('child_process');

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status);
  }
}

console.log('Applying Supabase migrations...');
run('npx', ['supabase', 'migration', 'up']);

console.log('Generating TypeScript types...');
run('npx', ['supabase', 'gen', 'types', 'typescript', '--local', '--project-id', 'local', '-o', 'src/types/database.types.ts']);
