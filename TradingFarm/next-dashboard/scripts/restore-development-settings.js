/**
 * Trading Farm Development Settings Restoration Script
 * 
 * This script restores original development settings after deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('==== Restoring Development Settings ====');

// Restore next.config.js
const nextConfigPath = path.join(process.cwd(), 'next.config.js');
const nextConfigBackupPath = path.join(process.cwd(), 'next.config.js.backup');

if (fs.existsSync(nextConfigBackupPath)) {
  fs.copyFileSync(nextConfigBackupPath, nextConfigPath);
  fs.unlinkSync(nextConfigBackupPath);
  console.log('✅ Restored original next.config.js');
} else {
  console.log('⚠️ Original next.config.js backup not found');
}

// Restore package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJsonBackupPath = path.join(process.cwd(), 'package.json.backup');

if (fs.existsSync(packageJsonBackupPath)) {
  fs.copyFileSync(packageJsonBackupPath, packageJsonPath);
  fs.unlinkSync(packageJsonBackupPath);
  console.log('✅ Restored original package.json');
} else {
  console.log('⚠️ Original package.json backup not found');
}

// Switch back to the main branch
try {
  console.log('Switching back to main branch...');
  execSync('git checkout main', { stdio: 'inherit' });
  console.log('✅ Switched back to main branch');
} catch (error) {
  console.warn('⚠️ Warning: Failed to switch Git branch:', error.message);
}

console.log('==== Development Settings Restored ====');
console.log('You can now continue development with original settings.');
