/**
 * Integration Test Fixer
 * 
 * This script helps identify and resolve common integration test issues
 * by checking for common patterns and providing fixes.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Running Integration Test Fixer');

// Configuration
const testsDir = path.resolve(__dirname, '../src/__tests__');
const integrationTestsDir = path.resolve(__dirname, '../src/tests/integration');
const fixablePatternsAndReplacements = [
  {
    // Fix jest not defined issues
    pattern: /jest\.useFakeTimers\(\)/g,
    replacement: 'vi.useFakeTimers()'
  },
  {
    pattern: /jest\.clearAllMocks\(\)/g,
    replacement: 'vi.clearAllMocks()'
  },
  {
    pattern: /jest\.useRealTimers\(\)/g,
    replacement: 'vi.useRealTimers()'
  },
  {
    pattern: /jest\.spyOn/g,
    replacement: 'vi.spyOn'
  },
  {
    // Fix imports
    pattern: /import\s+{\s*([^}]+)\s*}\s+from\s+['"]@testing-library\/react['"]/g,
    replacement: "import { $1 } from '@testing-library/react'"
  }
];

// Helper function to process directories
function processDirectory(dirPath) {
  try {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const fullPath = path.join(dirPath, file);
      
      if (fs.statSync(fullPath).isDirectory()) {
        processDirectory(fullPath);
      } else if (fullPath.endsWith('.test.tsx') || fullPath.endsWith('.test.ts')) {
        fixFile(fullPath);
      }
    });
  } catch (error) {
    console.error(`❌ Error processing directory ${dirPath}:`, error.message);
  }
}

// Function to fix a test file
function fixFile(filePath) {
  try {
    console.log(`🔧 Checking ${path.basename(filePath)}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let fixesApplied = 0;
    
    // Apply all patterns
    fixablePatternsAndReplacements.forEach(({ pattern, replacement }) => {
      const matchCount = (content.match(pattern) || []).length;
      if (matchCount > 0) {
        content = content.replace(pattern, replacement);
        fixesApplied += matchCount;
      }
    });
    
    // Check for missing imports
    if (content.includes('vi.') && !content.includes("import { vi }")) {
      content = content.replace(
        /import/,
        "import { vi } from 'vitest';\nimport"
      );
      fixesApplied++;
    }
    
    // Save file if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Applied ${fixesApplied} fixes to ${path.basename(filePath)}`);
    } else {
      console.log(`✓ No fixes needed for ${path.basename(filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error processing file ${filePath}:`, error.message);
  }
}

// Create missing integration test directory if needed
if (!fs.existsSync(integrationTestsDir)) {
  console.log('📁 Creating integration tests directory');
  fs.mkdirSync(integrationTestsDir, { recursive: true });
}

// Process all test directories
console.log('🔎 Processing test directories...');
processDirectory(testsDir);
if (fs.existsSync(integrationTestsDir)) {
  processDirectory(integrationTestsDir);
}

console.log('✨ Test fixing completed');
