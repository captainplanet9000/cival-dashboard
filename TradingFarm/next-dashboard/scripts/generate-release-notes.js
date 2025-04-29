#!/usr/bin/env node

/**
 * Release Notes Generator
 * 
 * This script generates release notes based on git commits between tags or specific commit ranges.
 * It categorizes changes based on conventional commit messages and outputs a formatted markdown document.
 * 
 * Usage:
 *   node generate-release-notes.js [options]
 * 
 * Options:
 *   --from <tag/commit>   Starting tag or commit (defaults to previous tag)
 *   --to <tag/commit>     Ending tag or commit (defaults to HEAD)
 *   --output <file>       Output file (defaults to release-notes.md)
 *   --version <version>   Version number for the release notes (defaults to package.json version)
 *   --title <title>       Title for the release notes (defaults to "Release Notes")
 * 
 * Example:
 *   node generate-release-notes.js --from v1.0.0 --to v1.1.0 --output docs/release-notes-v1.1.0.md
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  from: null,
  to: 'HEAD',
  output: 'release-notes.md',
  version: null,
  title: 'Release Notes'
};

// Parse command line arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--from' && i + 1 < args.length) {
    options.from = args[++i];
  } else if (arg === '--to' && i + 1 < args.length) {
    options.to = args[++i];
  } else if (arg === '--output' && i + 1 < args.length) {
    options.output = args[++i];
  } else if (arg === '--version' && i + 1 < args.length) {
    options.version = args[++i];
  } else if (arg === '--title' && i + 1 < args.length) {
    options.title = args[++i];
  }
}

// Determine the project root directory
const projectRoot = path.resolve(__dirname, '..');

// If version is not specified, get it from package.json
if (!options.version) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    options.version = packageJson.version;
  } catch (error) {
    console.error('Error reading package.json:', error.message);
    options.version = 'Unknown';
  }
}

// If from is not specified, get the previous tag
if (!options.from) {
  try {
    options.from = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    console.log(`Using previous tag as from: ${options.from}`);
  } catch (error) {
    // If no previous tag exists, use the first commit
    try {
      options.from = execSync('git rev-list --max-parents=0 HEAD', { encoding: 'utf8' }).trim();
      console.log(`No previous tag found, using first commit: ${options.from}`);
    } catch (innerError) {
      console.error('Error finding start point:', innerError.message);
      process.exit(1);
    }
  }
}

// Get the date for the release (current date)
const releaseDate = new Date().toISOString().split('T')[0];

// Get the commit log between the specified points
try {
  const commitLog = execSync(
    `git log ${options.from}..${options.to} --pretty=format:"%h|%s|%an|%ad" --date=short`,
    { encoding: 'utf8' }
  );

  // Parse commits and categorize them
  const categories = {
    feat: { title: '🚀 New Features', commits: [] },
    fix: { title: '🐛 Bug Fixes', commits: [] },
    perf: { title: '⚡ Performance Improvements', commits: [] },
    refactor: { title: '♻️ Refactoring', commits: [] },
    style: { title: '💄 Styling', commits: [] },
    docs: { title: '📝 Documentation', commits: [] },
    test: { title: '✅ Testing', commits: [] },
    build: { title: '👷 Build System', commits: [] },
    ci: { title: '🔄 Continuous Integration', commits: [] },
    chore: { title: '🔧 Chores', commits: [] }
  };

  // Other commits that don't match a category
  const otherCommits = [];

  // Parse each commit
  const commits = commitLog.split('\n').filter(Boolean);
  commits.forEach(commit => {
    const [hash, message, author, date] = commit.split('|');
    
    // Check for conventional commit format: type(scope): message
    const match = message.match(/^(\w+)(?:\(([^)]*)\))?: (.+)$/);
    
    if (match) {
      const [, type, scope, commitMessage] = match;
      
      if (categories[type]) {
        categories[type].commits.push({
          hash,
          message: commitMessage,
          scope,
          author,
          date
        });
      } else {
        otherCommits.push({ hash, message, author, date });
      }
    } else {
      otherCommits.push({ hash, message, author, date });
    }
  });

  // Generate the release notes in markdown format
  let releaseNotes = `# ${options.title} - v${options.version}\n\n`;
  releaseNotes += `**Release Date:** ${releaseDate}\n\n`;
  
  // Add summary of changes
  releaseNotes += '## Summary\n\n';
  
  let totalChanges = 0;
  Object.values(categories).forEach(category => {
    totalChanges += category.commits.length;
  });
  totalChanges += otherCommits.length;
  
  releaseNotes += `This release includes ${totalChanges} changes.\n\n`;
  
  // Add details for each category
  Object.values(categories).forEach(category => {
    if (category.commits.length > 0) {
      releaseNotes += `## ${category.title}\n\n`;
      
      // Group by scope
      const scopes = {};
      category.commits.forEach(commit => {
        const scope = commit.scope || 'general';
        if (!scopes[scope]) {
          scopes[scope] = [];
        }
        scopes[scope].push(commit);
      });
      
      // Add commits for each scope
      Object.entries(scopes).forEach(([scope, commits]) => {
        if (scope !== 'general') {
          releaseNotes += `### ${scope}\n\n`;
        }
        
        commits.forEach(commit => {
          releaseNotes += `- ${commit.message} ([${commit.hash.substring(0, 7)}](https://github.com/your-org/trading-farm/commit/${commit.hash}))\n`;
        });
        
        releaseNotes += '\n';
      });
    }
  });
  
  // Add other commits if any
  if (otherCommits.length > 0) {
    releaseNotes += '## Other Changes\n\n';
    otherCommits.forEach(commit => {
      releaseNotes += `- ${commit.message} ([${commit.hash.substring(0, 7)}](https://github.com/your-org/trading-farm/commit/${commit.hash}))\n`;
    });
    releaseNotes += '\n';
  }
  
  // Add contributors section
  const contributors = new Set();
  Object.values(categories).forEach(category => {
    category.commits.forEach(commit => {
      contributors.add(commit.author);
    });
  });
  otherCommits.forEach(commit => {
    contributors.add(commit.author);
  });
  
  if (contributors.size > 0) {
    releaseNotes += '## Contributors\n\n';
    contributors.forEach(contributor => {
      releaseNotes += `- ${contributor}\n`;
    });
    releaseNotes += '\n';
  }
  
  // Add installation and upgrade instructions
  releaseNotes += '## Installation & Upgrade Instructions\n\n';
  releaseNotes += '### Clean Installation\n\n';
  releaseNotes += '```bash\n';
  releaseNotes += '# Clone the repository\n';
  releaseNotes += 'git clone https://github.com/your-org/trading-farm.git\n';
  releaseNotes += 'cd trading-farm\n\n';
  releaseNotes += '# Install dependencies\n';
  releaseNotes += 'npm install\n\n';
  releaseNotes += '# Set up environment variables\n';
  releaseNotes += 'cp .env.example .env.local\n\n';
  releaseNotes += '# Run database migrations\n';
  releaseNotes += 'npm run db:migrate\n\n';
  releaseNotes += '# Generate database types\n';
  releaseNotes += 'npm run db:typegen\n\n';
  releaseNotes += '# Start the application\n';
  releaseNotes += 'npm run dev\n';
  releaseNotes += '```\n\n';
  
  releaseNotes += '### Upgrade from Previous Version\n\n';
  releaseNotes += '```bash\n';
  releaseNotes += '# Pull the latest changes\n';
  releaseNotes += 'git fetch\n';
  releaseNotes += `git checkout v${options.version}\n\n`;
  releaseNotes += '# Install dependencies\n';
  releaseNotes += 'npm install\n\n';
  releaseNotes += '# Run database migrations\n';
  releaseNotes += 'npm run db:migrate\n\n';
  releaseNotes += '# Generate database types\n';
  releaseNotes += 'npm run db:typegen\n\n';
  releaseNotes += '# Restart the application\n';
  releaseNotes += 'npm run dev\n';
  releaseNotes += '```\n\n';
  
  // Add a notice about breaking changes if any
  const breakingChanges = commits.filter(commit => 
    commit.split('|')[1].includes('BREAKING CHANGE') || 
    commit.split('|')[1].includes('!:')
  );
  
  if (breakingChanges.length > 0) {
    releaseNotes += '## ⚠️ Breaking Changes\n\n';
    breakingChanges.forEach(commit => {
      const [hash, message, author, date] = commit.split('|');
      releaseNotes += `- ${message} ([${hash.substring(0, 7)}](https://github.com/your-org/trading-farm/commit/${hash}))\n`;
    });
    releaseNotes += '\n';
    
    releaseNotes += '**Please read the breaking changes carefully before upgrading.**\n\n';
  }
  
  // Save the release notes to a file
  const outputPath = path.resolve(projectRoot, options.output);
  fs.writeFileSync(outputPath, releaseNotes);
  
  console.log(`Release notes generated successfully: ${outputPath}`);
  
} catch (error) {
  console.error('Error generating release notes:', error.message);
  process.exit(1);
}
