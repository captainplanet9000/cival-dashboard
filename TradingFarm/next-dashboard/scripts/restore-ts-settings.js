/**
 * Trading Farm TypeScript Settings Restoration Script
 * 
 * This script restores the original files after deployment
 */

const fs = require('fs');
const path = require('path');

console.log('==== Restoring TypeScript Files ====');

const backupDir = path.join(process.cwd(), 'backup-ts-files');
const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
const tsconfigBackupPath = path.join(backupDir, 'tsconfig.json.backup');

// Restore tsconfig
if (fs.existsSync(tsconfigBackupPath)) {
  fs.copyFileSync(tsconfigBackupPath, tsconfigPath);
  console.log('✅ Restored original tsconfig.json');
}

// Restore individual files
fs.readdirSync(backupDir).forEach(file => {
  if (file === 'tsconfig.json.backup') return;
  
  // Find original path for file
  const sourcePaths = [
    'src/components/agents',
    'src/components/brain',
    'src/components/exchange',
    'src/components/market',
    'src/components/simulation',
    'src/hooks/react-query',
    'src/lib/exchange/connectors',
    'src/server',
    'src/services',
    'src/tests',
    'src/utils',
    'src/utils/performance',
    'src/utils/security',
    'src/utils/trading'
  ];
  
  for (const sourcePath of sourcePaths) {
    const targetPath = path.join(process.cwd(), sourcePath, file);
    if (fs.existsSync(targetPath)) {
      const backupPath = path.join(backupDir, file);
      fs.copyFileSync(backupPath, targetPath);
      console.log(`✅ Restored ${targetPath}`);
      break;
    }
  }
});

console.log('==== Restoration Complete ====');
