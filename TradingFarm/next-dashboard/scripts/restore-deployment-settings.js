/**
 * Trading Farm Development Settings Restoration Script
 * 
 * This script restores the original development configuration after deployment
 */

const fs = require('fs');
const path = require('path');

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

// Remove deployment tsconfig
const deploymentTsconfigPath = path.join(process.cwd(), 'tsconfig.build.json');
if (fs.existsSync(deploymentTsconfigPath)) {
  fs.unlinkSync(deploymentTsconfigPath);
  console.log('✅ Removed deployment TypeScript config');
}

// Remove .env.deployment
const envDeploymentPath = path.join(process.cwd(), '.env.deployment');
if (fs.existsSync(envDeploymentPath)) {
  fs.unlinkSync(envDeploymentPath);
  console.log('✅ Removed .env.deployment');
}

console.log('==== Development Settings Restored ====');
console.log('You can now continue development with original type checking settings.');
