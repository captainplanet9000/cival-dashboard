/**
 * Trading Farm Client Component Fix Script
 * 
 * This script adds "use client" directives to React components that use hooks
 */

const fs = require('fs');
const path = require('path');

console.log('==== Adding "use client" Directives to React Components ====');

// Files that need the "use client" directive
const filesToFix = [
  'src/components/analytics/AIPredictionPanel.tsx',
  'src/components/analytics/PerformanceAnalyticsDashboard.tsx',
  'src/hooks/useWebSocketConnections.ts',
  'src/components/websocket/ConnectionHealthDashboard.tsx',
  'src/components/trading/TradingDashboard.tsx',
  'src/components/trading/mobile-trading-interface.tsx',
  'src/components/layout/responsive-layout.tsx'
];

// Add "use client" directive to files
filesToFix.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (fs.existsSync(fullPath)) {
    // Read file content
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Add "use client" if not already present
    if (!content.includes('"use client"') && !content.includes("'use client'")) {
      content = '"use client";\n\n' + content;
      
      // Write modified content back
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Added "use client" directive to ${filePath}`);
    } else {
      console.log(`⏭️ File ${filePath} already has "use client" directive`);
    }
  } else {
    console.log(`⚠️ File not found: ${filePath}`);
  }
});

console.log('\n==== Client Component Fix Complete ====');
