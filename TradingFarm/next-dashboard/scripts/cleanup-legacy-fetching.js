#!/usr/bin/env node

/**
 * Legacy Code Cleanup Utility
 * 
 * This script helps identify and clean up legacy state management and 
 * fetching patterns as part of Phase 5 of the TanStack Query implementation.
 * 
 * Run with: node scripts/cleanup-legacy-fetching.js [--check] [--fix] [--path=<dir>]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg === '--check') {
    acc.check = true;
  } else if (arg === '--fix') {
    acc.fix = true;
  } else if (arg.startsWith('--path=')) {
    acc.path = arg.split('=')[1];
  }
  return acc;
}, { 
  check: false, 
  fix: false, 
  path: path.join(__dirname, '..', 'src')
});

// Patterns to search for
const patterns = [
  // useState/useEffect fetching patterns
  {
    name: 'useState/useEffect fetch pattern',
    grep: `grep -r "const \\[.*\\] = useState.*\\; const \\[.*isLoading.*\\] = useState\\(.*\\)" --include="*.tsx" --include="*.ts" ${args.path}`,
    refactorTip: 'Replace with useQuery hook: useQuery({ queryKey: ["data"], queryFn: fetchData })'
  },
  // Direct fetch calls
  {
    name: 'Direct fetch API calls',
    grep: `grep -r "fetch\\(.*\\)" --include="*.tsx" --include="*.ts" ${args.path} | grep -v "queryFn"`,
    refactorTip: 'Replace with apiService or use within useQuery queryFn'
  },
  // Axios calls without TanStack Query
  {
    name: 'Direct axios calls',
    grep: `grep -r "axios\\." --include="*.tsx" --include="*.ts" ${args.path} | grep -v "queryFn" | grep -v "mutationFn"`,
    refactorTip: 'Use with useQuery or useMutation hooks'
  },
  // Manual loading states
  {
    name: 'Manual loading state management',
    grep: `grep -r "setIsLoading\\(true\\)" --include="*.tsx" --include="*.ts" ${args.path}`,
    refactorTip: 'Replace with useQuery isLoading or useMutation isPending states'
  },
  // Manual error handling
  {
    name: 'Manual error handling',
    grep: `grep -r "setError\\(" --include="*.tsx" --include="*.ts" ${args.path} | grep -v "mutationFn" | grep -v "queryFn"`,
    refactorTip: 'Replace with useQuery error state or useMutation onError callback'
  },
  // useEffect with API dependencies
  {
    name: 'useEffect with API dependencies',
    grep: `grep -r "useEffect\\(.*\\, \\[.*\\]\\)" -A 5 --include="*.tsx" --include="*.ts" ${args.path} | grep -A 5 "fetch\\|axios"`,
    refactorTip: 'Replace with useQuery and proper dependency tracking via queryKey'
  }
];

console.log('🔍 Checking for legacy fetching patterns...\n');

// Track files to potentially fix
const filesToFix = new Set();

// Run each pattern check
patterns.forEach(pattern => {
  console.log(`\n## Checking pattern: ${pattern.name}`);
  console.log('──────────────────────────────────────────────');
  
  try {
    const result = execSync(pattern.grep, { encoding: 'utf-8' });
    
    if (result.trim()) {
      console.log(result);
      
      // Add found files to the set
      result.split('\n').forEach(line => {
        if (line.trim()) {
          const filePath = line.split(':')[0];
          if (filePath && filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
            filesToFix.add(filePath);
          }
        }
      });
      
      console.log(`\n💡 Refactor tip: ${pattern.refactorTip}`);
    } else {
      console.log('No matches found. ✅');
    }
  } catch (error) {
    // grep returns non-zero exit code when no matches are found
    console.log('No matches found. ✅');
  }
});

// Show summary
console.log('\n\n📊 Summary:');
console.log('──────────────────────────────────────────────');

if (filesToFix.size === 0) {
  console.log('🎉 No legacy fetching patterns found!');
} else {
  console.log(`🔍 Found ${filesToFix.size} files with legacy fetching patterns:`);
  
  const fileList = Array.from(filesToFix);
  fileList.forEach(file => {
    console.log(`  - ${file}`);
  });
  
  console.log('\n📝 Next steps:');
  console.log('1. Refactor these files to use TanStack Query hooks');
  console.log('2. Ensure consistent query key patterns');
  console.log('3. Add appropriate error handling');
  console.log('4. Add tests for the new implementations');

  // If fix flag is provided, generate a refactor plan
  if (args.fix) {
    console.log('\n⚙️ Generating refactor plan...');
    
    // Create a refactor plan directory if it doesn't exist
    const refactorDir = path.join(__dirname, '..', 'refactor-plans');
    if (!fs.existsSync(refactorDir)) {
      fs.mkdirSync(refactorDir);
    }
    
    // Generate a plan for each file
    fileList.forEach(file => {
      try {
        const fileContent = fs.readFileSync(file, 'utf-8');
        const fileName = path.basename(file);
        const planFilePath = path.join(refactorDir, `${fileName.replace(/\./g, '_')}_refactor_plan.md`);
        
        // Create a basic refactor plan
        const plan = generateRefactorPlan(file, fileContent);
        
        fs.writeFileSync(planFilePath, plan);
        console.log(`  Generated plan for ${fileName}: ${planFilePath}`);
      } catch (error) {
        console.error(`  Error generating plan for ${file}:`, error);
      }
    });
  }
}

/**
 * Generate a basic refactor plan for a file
 */
function generateRefactorPlan(filePath, content) {
  const fileName = path.basename(filePath);
  
  // Detect component name
  const componentNameMatch = content.match(/function\s+([A-Z][a-zA-Z0-9]*)/);
  const componentName = componentNameMatch ? componentNameMatch[1] : fileName.replace(/\.(tsx|ts)$/, '');
  
  // Detect useState patterns for data, loading, error
  const useStateMatches = content.match(/const\s+\[\s*([^,\]]+)[^\]]*\]\s*=\s*useState[<\(]/g) || [];
  const stateVars = useStateMatches.map(match => {
    const stateVar = match.match(/const\s+\[\s*([^,\]]+)/)[1];
    return stateVar.trim();
  });
  
  // Detect fetch or axios calls
  const hasFetch = content.includes('fetch(');
  const hasAxios = content.includes('axios.');
  const hasUseEffect = content.includes('useEffect(');
  
  // Create refactor plan template
  return `# Refactor Plan for ${fileName}

## Component: ${componentName}

### Current Implementation
${useStateMatches.length > 0 ? '- Uses useState for state management:\n  - ' + stateVars.join('\n  - ') : '- No useState patterns detected'}
${hasUseEffect ? '- Uses useEffect for data fetching' : ''}
${hasFetch ? '- Uses fetch API directly' : ''}
${hasAxios ? '- Uses axios directly' : ''}

### Refactor Steps

1. Identify query requirements:
   - Determine data dependencies
   - Define appropriate query keys
   - Consider caching requirements

2. Replace manual state management with TanStack Query:
   - Create/reuse appropriate query hooks
   - Update component to use query results
   - Handle loading and error states with query properties

3. For mutations:
   - Identify current mutation patterns
   - Replace with useMutation hooks
   - Add optimistic updates if applicable
   - Implement proper error handling

4. Cleanup:
   - Remove unused imports
   - Remove manual state management code
   - Remove direct fetch/axios calls
   - Update comments and documentation

### TanStack Query Implementation

\`\`\`tsx
// Example implementation - adjust based on actual component needs
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/utils/react-query/query-keys';
import { apiService } from '@/services/api-service';

function ${componentName}() {
  // Replace manual state and fetching with useQuery
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.namespace.operation(params)._def,
    queryFn: () => apiService.get('/endpoint'),
  });

  // Rest of component...
}
\`\`\`

### Testing Plan

1. Create a test file for the component
2. Test successful data fetching
3. Test loading states
4. Test error handling
5. Test component interaction with fetched data

`;
}

// Print help if no options provided
if (!args.check && !args.fix) {
  console.log('\n\nUsage:');
  console.log('  node scripts/cleanup-legacy-fetching.js [options]');
  console.log('\nOptions:');
  console.log('  --check           Check for legacy fetching patterns only');
  console.log('  --fix             Generate refactor plans for affected files');
  console.log('  --path=<dir>      Specify a directory to check (default: src)');
  console.log('\nExamples:');
  console.log('  node scripts/cleanup-legacy-fetching.js --check');
  console.log('  node scripts/cleanup-legacy-fetching.js --fix --path=src/components');
}
