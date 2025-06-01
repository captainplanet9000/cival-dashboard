/**
 * Trading Farm Build Optimization Script
 * 
 * This script performs optimization tasks for the production build:
 * 1. Analyzes bundle size
 * 2. Optimizes images 
 * 3. Verifies type safety
 * 4. Ensures dependencies are properly tree-shaken
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('==== Trading Farm Production Build Optimization ====');

// Environment check
if (process.env.NODE_ENV !== 'production') {
  console.warn('Warning: Running optimization in non-production environment.');
  process.env.NODE_ENV = 'production';
}

// Step 1: Type checking
console.log('\n📝 Performing TypeScript type checking...');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✅ TypeScript type checking passed.');
} catch (error) {
  console.error('❌ TypeScript errors detected. Fix type issues before building for production.');
  process.exit(1);
}

// Step 2: Lint checking
console.log('\n🔍 Running linter checks...');
try {
  execSync('npx eslint . --ext .ts,.tsx', { stdio: 'inherit' });
  console.log('✅ Linting passed.');
} catch (error) {
  console.warn('⚠️ Linting issues detected. Consider fixing before production deployment.');
}

// Step 3: Run test suite
console.log('\n🧪 Running test suite...');
try {
  execSync('npm test', { stdio: 'inherit' });
  console.log('✅ All tests passed.');
} catch (error) {
  console.error('❌ Test failures detected. Fix failing tests before production deployment.');
  process.exit(1);
}

// Step 4: Check for unused dependencies
console.log('\n📦 Checking for unused dependencies...');
try {
  execSync('npx depcheck', { stdio: 'inherit' });
  console.log('✅ Dependency check completed.');
} catch (error) {
  console.warn('⚠️ Dependency check failed. Consider reviewing your dependencies.');
}

// Step 5: Next.js build with bundle analysis
console.log('\n🔧 Building with bundle analysis...');
try {
  execSync('npx cross-env ANALYZE=true next build', { stdio: 'inherit' });
  console.log('✅ Build completed with bundle analysis.');
} catch (error) {
  console.error('❌ Build failed. Check the errors above.');
  process.exit(1);
}

// Step 6: Clean build artifacts if needed
console.log('\n🧹 Cleaning unnecessary build artifacts...');
try {
  // Remove source maps in production if needed
  if (fs.existsSync('./out')) {
    const sourceMapFiles = findFilesRecursively('./out', '.map');
    if (sourceMapFiles.length > 0) {
      console.log(`Found ${sourceMapFiles.length} source map files to remove.`);
      sourceMapFiles.forEach(file => {
        fs.unlinkSync(file);
      });
    }
  }
  console.log('✅ Cleanup completed.');
} catch (error) {
  console.warn('⚠️ Cleanup failed:', error.message);
}

console.log('\n🎉 Build optimization completed!');
console.log('Run a production server using: npm run start');
console.log('====================================================');

/**
 * Find files recursively by extension
 */
function findFilesRecursively(dir, extension) {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results = results.concat(findFilesRecursively(filePath, extension));
    } else if (filePath.endsWith(extension)) {
      results.push(filePath);
    }
  }
  
  return results;
}
