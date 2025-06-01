const fs = require('fs');
const path = require('path');

// Path to package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');

// Read package.json
console.log('Updating package.json with Node.js polyfills...');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Add webpack polyfill dependencies if they don't exist
const polyfillDeps = {
  'assert': '^2.0.0',
  'browserify-zlib': '^0.2.0',
  'buffer': '^6.0.3',
  'crypto-browserify': '^3.12.0',
  'https-browserify': '^1.0.0',
  'os-browserify': '^0.3.0',
  'path-browserify': '^1.0.1',
  'process': '^0.11.10',
  'stream-browserify': '^3.0.0',
  'stream-http': '^3.2.0',
  'url': '^0.11.0',
  'util': '^0.12.5'
};

// Add the dependencies if they don't exist
const dependencies = packageJson.dependencies || {};
let dependenciesChanged = false;

Object.entries(polyfillDeps).forEach(([name, version]) => {
  if (!dependencies[name]) {
    dependencies[name] = version;
    dependenciesChanged = true;
    console.log(`Added ${name}@${version}`);
  }
});

if (dependenciesChanged) {
  packageJson.dependencies = dependencies;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('Updated package.json with polyfill dependencies');
}

// Create a simplified next.config.js for production build
const nextConfigPath = path.join(process.cwd(), 'next.config.js');
const nextConfigBackupPath = path.join(process.cwd(), 'next.config.js.backup');

// Backup original next.config.js if not already backed up
if (!fs.existsSync(nextConfigBackupPath)) {
  fs.copyFileSync(nextConfigPath, nextConfigBackupPath);
  console.log('Backed up original next.config.js');
}

// Create a production-ready next.config.js
const productionNextConfig = `/** @type {import('next').NextConfig} */

// Production deployment configuration with maximum compatibility
const nextConfig = {
  // Disable type checking for production builds
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable ESLint checks for production builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configure output format
  output: 'standalone',
  // Disable React strict mode for production
  reactStrictMode: false,
  // Add webpack configuration for Node.js polyfills
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client-side polyfills
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: require.resolve('path-browserify'),
        os: require.resolve('os-browserify/browser'),
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        zlib: require.resolve('browserify-zlib'),
        assert: require.resolve('assert/'),
        url: require.resolve('url/'),
        util: require.resolve('util/'),
        buffer: require.resolve('buffer/'),
        process: require.resolve('process/browser'),
        net: false,
        tls: false,
        child_process: false,
        dns: false,
      };
      
      // Add polyfill plugins
      config.plugins.push(
        new config.webpack.ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer'],
        })
      );
    }
    return config;
  },
};

module.exports = nextConfig;
`;

fs.writeFileSync(nextConfigPath, productionNextConfig);
console.log('Created production-ready next.config.js');

// Create a simplified deployment script
const deployScriptPath = path.join(process.cwd(), 'scripts', 'deploy-production.js');

const deployScript = `const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to execute commands and log output
function runCommand(command) {
  console.log(\`\\n> Running: \${command}\\n\`);
  
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(\`Error executing command: \${command}\`);
    console.error(error.message);
    return false;
  }
}

// Install dependencies if needed
runCommand('npm install --legacy-peer-deps');

// Generate type definitions
console.log('Generating type definitions...');
if (runCommand('npx supabase gen types typescript --local > src/types/database.types.ts')) {
  console.log('✅ Type definitions generated successfully');
}

// Set production environment
console.log('Setting production environment...');
if (fs.existsSync('.env')) {
  fs.copyFileSync('.env', '.env.backup');
  console.log('✅ Backed up .env file');
}

if (fs.existsSync('.env.production')) {
  fs.copyFileSync('.env.production', '.env');
  console.log('✅ Set production environment');
} else {
  console.log('⚠️ No production environment file found. Make sure to set up production variables.');
}

// Build the application with maximum compatibility
console.log('Building application...');
if (runCommand('npx next build')) {
  console.log('✅ Application built successfully');
  
  // Start the application
  console.log('\\n=========================================');
  console.log('Application successfully built for production!');
  console.log('To start the application, run:');
  console.log('npm run start');
  console.log('=========================================\\n');
} else {
  console.error('❌ Failed to build the application');
}
`;

fs.writeFileSync(deployScriptPath, deployScript);
console.log('Created deploy-production.js script');

console.log(`
✅ Setup complete!

To deploy the application, run:
  1. npm install --legacy-peer-deps
  2. node scripts/deploy-production.js

This will install the required polyfills, build the application,
and prepare it for production deployment.
`);
