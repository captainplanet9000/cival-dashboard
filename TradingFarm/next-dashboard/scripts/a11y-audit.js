/**
 * Accessibility Audit Tool for Trading Farm Dashboard
 * 
 * This script runs automated accessibility tests on the dashboard
 * using axe-core and generates a report of issues.
 */
const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');
const fs = require('fs');
const path = require('path');

// Pages to test
const PAGES = [
  { name: 'Dashboard', path: '/' },
  { name: 'Trading Terminal', path: '/dashboard/trading' },
  { name: 'Agent Orchestration', path: '/dashboard/agent-orchestration' },
  { name: 'Risk Management', path: '/dashboard/risk' },
  { name: 'Account Settings', path: '/dashboard/account' },
];

// Create reports directory if it doesn't exist
const REPORTS_DIR = path.join(__dirname, '../reports/accessibility');
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Run accessibility audit on all pages
 */
async function runA11yAudit() {
  console.log('Starting accessibility audit...');
  
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
  });
  
  // Create timestamp for the report
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const reportPath = path.join(REPORTS_DIR, `a11y-report-${timestamp}.json`);
  const summaryPath = path.join(REPORTS_DIR, `a11y-summary-${timestamp}.md`);
  
  // Initialize report data
  const reportData = {
    timestamp,
    summary: {},
    violations: {},
  };
  
  try {
    const page = await browser.newPage();
    
    // Login first if needed
    await login(page);
    
    // Audit each page
    for (const { name, path } of PAGES) {
      console.log(`Auditing ${name}...`);
      await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle2' });
      
      // Run axe analysis
      const results = await new AxePuppeteer(page).analyze();
      
      // Store results
      reportData.violations[name] = results.violations;
      reportData.summary[name] = {
        violations: results.violations.length,
        critical: results.violations.filter(v => v.impact === 'critical').length,
        serious: results.violations.filter(v => v.impact === 'serious').length,
        moderate: results.violations.filter(v => v.impact === 'moderate').length,
        minor: results.violations.filter(v => v.impact === 'minor').length,
      };
      
      console.log(`  Found ${results.violations.length} violations on ${name}`);
    }
    
    // Write full report to JSON
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`Full report written to ${reportPath}`);
    
    // Generate and write summary report
    const summary = generateSummary(reportData);
    fs.writeFileSync(summaryPath, summary);
    console.log(`Summary report written to ${summaryPath}`);
    
  } catch (error) {
    console.error('Error running accessibility audit:', error);
  } finally {
    await browser.close();
  }
}

/**
 * Log in to the application
 */
async function login(page) {
  try {
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    // Fill in login form
    await page.type('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.type('input[type="password"]', process.env.TEST_USER_PASSWORD || 'password');
    
    // Submit form
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ]);
    
    console.log('Logged in successfully');
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
}

/**
 * Generate a markdown summary of the accessibility audit
 */
function generateSummary(reportData) {
  let markdown = `# Accessibility Audit Report\n\n`;
  markdown += `Generated: ${new Date(reportData.timestamp).toLocaleString()}\n\n`;
  
  // Summary table
  markdown += `## Summary\n\n`;
  markdown += `| Page | Violations | Critical | Serious | Moderate | Minor |\n`;
  markdown += `|------|------------|----------|---------|----------|-------|\n`;
  
  let totalViolations = 0;
  let totalCritical = 0;
  let totalSerious = 0;
  let totalModerate = 0;
  let totalMinor = 0;
  
  for (const [name, summary] of Object.entries(reportData.summary)) {
    markdown += `| ${name} | ${summary.violations} | ${summary.critical} | ${summary.serious} | ${summary.moderate} | ${summary.minor} |\n`;
    
    totalViolations += summary.violations;
    totalCritical += summary.critical;
    totalSerious += summary.serious;
    totalModerate += summary.moderate;
    totalMinor += summary.minor;
  }
  
  markdown += `| **Total** | **${totalViolations}** | **${totalCritical}** | **${totalSerious}** | **${totalModerate}** | **${totalMinor}** |\n\n`;
  
  // Violations details
  markdown += `## Violations Details\n\n`;
  
  for (const [pageName, violations] of Object.entries(reportData.violations)) {
    if (violations.length === 0) continue;
    
    markdown += `### ${pageName}\n\n`;
    
    for (const violation of violations) {
      markdown += `#### ${violation.id}: ${violation.help}\n\n`;
      markdown += `**Impact:** ${violation.impact}\n\n`;
      markdown += `**Description:** ${violation.description}\n\n`;
      markdown += `**Help URL:** ${violation.helpUrl}\n\n`;
      markdown += `**Affected elements:** ${violation.nodes.length}\n\n`;
      
      // Include first 3 nodes as examples
      const nodesToShow = violation.nodes.slice(0, 3);
      if (nodesToShow.length > 0) {
        markdown += `**Examples:**\n\n`;
        for (const node of nodesToShow) {
          markdown += `- \`${node.html}\`\n`;
          markdown += `  - ${node.failureSummary}\n\n`;
        }
      }
      
      markdown += `---\n\n`;
    }
  }
  
  // Recommendations
  markdown += `## Recommendations\n\n`;
  
  if (totalCritical > 0) {
    markdown += `### Critical Issues (${totalCritical})\n\n`;
    markdown += `These issues have severe impact on users with disabilities and should be fixed immediately:\n\n`;
    // List common critical issues
    listCommonIssues(reportData, 'critical', markdown);
  }
  
  if (totalSerious > 0) {
    markdown += `### Serious Issues (${totalSerious})\n\n`;
    markdown += `These issues have serious impact on users with disabilities and should be prioritized:\n\n`;
    // List common serious issues
    listCommonIssues(reportData, 'serious', markdown);
  }
  
  return markdown;
}

/**
 * List common issues of a specific impact level
 */
function listCommonIssues(reportData, impact, markdown) {
  // Collect all violations of the specified impact
  const issuesMap = new Map();
  
  for (const violations of Object.values(reportData.violations)) {
    for (const violation of violations.filter(v => v.impact === impact)) {
      if (issuesMap.has(violation.id)) {
        issuesMap.set(violation.id, {
          ...issuesMap.get(violation.id),
          count: issuesMap.get(violation.id).count + violation.nodes.length,
        });
      } else {
        issuesMap.set(violation.id, {
          id: violation.id,
          help: violation.help,
          description: violation.description,
          helpUrl: violation.helpUrl,
          count: violation.nodes.length,
        });
      }
    }
  }
  
  // Sort by count (highest first)
  const sortedIssues = Array.from(issuesMap.values()).sort((a, b) => b.count - a.count);
  
  // List top issues
  for (const issue of sortedIssues) {
    markdown += `1. **${issue.help}** (${issue.count} instances)\n`;
    markdown += `   - ${issue.description}\n`;
    markdown += `   - [Learn more](${issue.helpUrl})\n\n`;
  }
}

// Run the audit
runA11yAudit();
