#!/usr/bin/env node

/**
 * This script analyzes the Next.js bundle size and generates a report
 * to help identify opportunities for optimization.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const BUNDLE_ANALYZER_PORT = 8888;
const SIZE_THRESHOLD_WARNING_KB = 200; // Size in KB to flag as potentially concerning
const SIZE_THRESHOLD_ERROR_KB = 500; // Size in KB to flag as problematic

console.log('🔍 Trading Farm Dashboard Bundle Analysis');
console.log('=========================================');

try {
  // Create directory for reports if it doesn't exist
  const reportDir = path.join(__dirname, '..', 'bundle-analysis');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // Set the environment variables for the analysis
  process.env.ANALYZE = 'true';
  process.env.NODE_ENV = 'production';

  console.log('📦 Building and analyzing production bundle...');
  console.log('This may take a few minutes. Please be patient.\n');

  // Run the build with analysis
  execSync('npx next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      ANALYZE: 'true',
      BUNDLE_ANALYZE_MODE: 'server',
      BUNDLE_ANALYZE_PORT: BUNDLE_ANALYZER_PORT.toString(),
    },
  });

  // Record the timestamp for the report
  const timestamp = new Date().toISOString().replace(/:/g, '-');

  // Path for more detailed report
  const reportPath = path.join(reportDir, `bundle-report-${timestamp}.txt`);

  console.log('\n✅ Bundle analysis complete!');
  console.log(`\n📊 View the interactive report at: http://localhost:${BUNDLE_ANALYZER_PORT}`);
  console.log(`🔗 A static report has been saved to: ${reportPath}`);
  
  // Generate additional bundle insights
  console.log('\n📝 Generating additional bundle insights...');
  
  // Get .next directory stats
  const clientDir = path.join(__dirname, '..', '.next', 'static');
  if (fs.existsSync(clientDir)) {
    // Extract bundle size information
    const bundleSizes = extractBundleSizes(clientDir);
    
    // Generate a report with recommendations
    generateReport(bundleSizes, reportPath);
  } else {
    console.error('\n❌ Could not find build output directory. Make sure the build succeeded.');
  }
  
  console.log('\n🚀 Bundle analysis completed successfully!');
  console.log('You can now optimize your bundle based on these insights.');
  
} catch (error) {
  console.error('\n❌ Bundle analysis failed:', error.message);
  process.exit(1);
}

/**
 * Extract size information from bundle files
 * @param {string} dir Directory to analyze
 * @returns {Array} Array of bundle file information
 */
function extractBundleSizes(dir) {
  const bundles = [];
  
  // Process chunk files
  const chunkDirs = ['chunks', 'css'];
  chunkDirs.forEach(subDir => {
    const chunkDir = path.join(dir, subDir);
    if (fs.existsSync(chunkDir)) {
      fs.readdirSync(chunkDir).forEach(file => {
        const filePath = path.join(chunkDir, file);
        const stats = fs.statSync(filePath);
        
        // Only process files, not directories
        if (stats.isFile()) {
          bundles.push({
            name: file,
            path: filePath,
            size: stats.size,
            type: subDir,
          });
        }
      });
    }
  });

  return bundles;
}

/**
 * Generate a detailed report with optimization recommendations
 * @param {Array} bundles Array of bundle information
 * @param {string} reportPath Path to save the report
 */
function generateReport(bundles, reportPath) {
  // Sort bundles by size (largest first)
  bundles.sort((a, b) => b.size - a.size);
  
  let report = '# Trading Farm Dashboard Bundle Analysis Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  report += '## Bundle Size Summary\n\n';
  report += 'File | Type | Size (KB) | Status\n';
  report += '-----|------|-----------|-------\n';
  
  let totalSize = 0;
  let largeFiles = 0;
  
  bundles.forEach(bundle => {
    const sizeKB = (bundle.size / 1024).toFixed(2);
    totalSize += bundle.size;
    
    let status = '✅';
    if (sizeKB > SIZE_THRESHOLD_ERROR_KB) {
      status = '🔴 Action needed';
      largeFiles++;
    } else if (sizeKB > SIZE_THRESHOLD_WARNING_KB) {
      status = '🟡 Review';
      largeFiles++;
    }
    
    report += `${bundle.name} | ${bundle.type} | ${sizeKB} | ${status}\n`;
  });
  
  const totalSizeKB = (totalSize / 1024).toFixed(2);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  
  report += `\nTotal Size: ${totalSizeKB}KB (${totalSizeMB}MB)\n\n`;
  
  // Add optimization recommendations
  report += '## Optimization Recommendations\n\n';
  
  if (largeFiles > 0) {
    report += `Found ${largeFiles} files that could benefit from optimization.\n\n`;
    report += 'Consider the following strategies:\n\n';
    report += '1. **Code Splitting**: Ensure components are properly lazy-loaded\n';
    report += '2. **Tree Shaking**: Import only what you need from libraries\n';
    report += '3. **Dynamic Imports**: Use dynamic imports for heavy dependencies\n';
    report += '4. **Optimize Images**: Use proper image formats and Next.js Image component\n';
    report += '5. **Reduce Dependencies**: Review and remove unnecessary dependencies\n';
  } else {
    report += 'Your bundle sizes look good! Continue monitoring as the application grows.\n';
  }
  
  // Find potential duplicate packages
  report += '\n## Potential Duplicate Packages\n\n';
  
  // Simple heuristic to identify potential duplicates (files with similar names)
  const fileGroups = {};
  bundles.forEach(bundle => {
    const baseName = bundle.name.replace(/\.[0-9a-f]+\./, '.').replace(/\.js$/, '');
    if (!fileGroups[baseName]) {
      fileGroups[baseName] = [];
    }
    fileGroups[baseName].push(bundle);
  });
  
  const potentialDuplicates = Object.keys(fileGroups).filter(key => fileGroups[key].length > 1);
  
  if (potentialDuplicates.length > 0) {
    report += 'These files might indicate duplicated code or dependencies:\n\n';
    potentialDuplicates.forEach(key => {
      report += `- **${key}**: ${fileGroups[key].length} versions found\n`;
      fileGroups[key].forEach(bundle => {
        report += `  - ${bundle.name} (${(bundle.size / 1024).toFixed(2)}KB)\n`;
      });
      report += '\n';
    });
  } else {
    report += 'No potential duplicates detected.\n';
  }
  
  // Save the report
  fs.writeFileSync(reportPath, report);
  
  // Log a summary to the console
  console.log(`\n📑 Total bundle size: ${totalSizeMB}MB (${totalSizeKB}KB)`);
  console.log(`🔍 Found ${largeFiles} files that could benefit from optimization.`);
  console.log(`📋 Full details available in the report: ${reportPath}`);
}
