#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define essential dependencies for DeFi integration
const dependencies = {
  "dependencies": {
    // Core dependencies
    "axios": "^1.6.2",
    "ethers": "^5.7.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "next": "^14.0.3", 
    "ws": "^8.14.2"
    
    // We'll install protocol SDKs individually later
    // Remove problematic SDKs that don't exist in the registry
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.39",
    "@types/react-dom": "^18.2.17",
    "@types/ws": "^8.5.9",
    "typescript": "^5.3.2"
  }
};

/**
 * Install a specific dependency using npm
 */
function installDependency(pkg, version, isDev = false) {
  const command = `npm install ${pkg}@${version.replace('^', '')} ${isDev ? '--save-dev' : '--save'}`;
  
  try {
    console.log(`Installing ${pkg}@${version}...`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Failed to install ${pkg}@${version}:`, error.message);
    return false;
  }
}

/**
 * Main function to install all dependencies
 */
async function installDependencies() {
  console.log('Starting DeFi integration dependency installation...');
  
  // Install regular dependencies
  console.log('\nInstalling regular dependencies:');
  const depResults = Object.entries(dependencies.dependencies).map(([pkg, version]) => {
    return installDependency(pkg, version);
  });
  
  // Install dev dependencies
  console.log('\nInstalling dev dependencies:');
  const devDepResults = Object.entries(dependencies.devDependencies).map(([pkg, version]) => {
    return installDependency(pkg, version, true);
  });
  
  // Check results
  const allResults = [...depResults, ...devDepResults];
  const allSucceeded = allResults.every(result => result);
  
  if (allSucceeded) {
    console.log('\n✅ All dependencies installed successfully!');
    
    // Install individual protocol SDKs
    await installProtocolSDKs();
  } else {
    console.error('\n❌ Some dependencies failed to install. Please check the logs above.');
    process.exit(1);
  }
}

/**
 * Install protocol-specific SDKs individually
 */
async function installProtocolSDKs() {
  console.log('\nAttempting to install protocol-specific SDKs...');
  
  const sdks = [
    { name: 'Uniswap SDK Core', pkg: '@uniswap/sdk-core', version: '4.0.7' },
    { name: 'Uniswap V3 SDK', pkg: '@uniswap/v3-sdk', version: '3.10.0' },
    { name: 'Aave Protocol', pkg: '@aave/protocol-js', version: '4.3.0' }
  ];
  
  for (const sdk of sdks) {
    try {
      console.log(`\nInstalling ${sdk.name}...`);
      execSync(`npm install ${sdk.pkg}@${sdk.version} --save`, { stdio: 'inherit' });
      console.log(`✅ Successfully installed ${sdk.name}`);
    } catch (error) {
      console.error(`❌ Failed to install ${sdk.name}:`, error.message);
      console.log(`You may need to install ${sdk.name} manually.`);
    }
  }
}

/**
 * Update package.json with the correct dependencies
 */
function updatePackageJson() {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    
    // Check if package.json exists
    if (!fs.existsSync(packageJsonPath)) {
      console.log('Creating new package.json...');
      
      const newPackageJson = {
        name: "trading-farm",
        version: "0.1.0",
        private: true,
        ...dependencies,
        scripts: {
          "dev": "next dev",
          "build": "next build",
          "start": "next start",
          "lint": "next lint"
        }
      };
      
      fs.writeFileSync(packageJsonPath, JSON.stringify(newPackageJson, null, 2));
      console.log('✅ Created package.json with required dependencies');
      return true;
    }
    
    // Update existing package.json
    console.log('Updating existing package.json...');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Remove any problematic dependencies first
    if (packageJson.dependencies) {
      delete packageJson.dependencies['@gmx-io/v2-contracts'];
      delete packageJson.dependencies['@sushiswap/sdk'];
    }
    
    // Merge dependencies
    packageJson.dependencies = {
      ...packageJson.dependencies,
      ...dependencies.dependencies
    };
    
    // Merge devDependencies
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      ...dependencies.devDependencies
    };
    
    // Write updated package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Updated package.json with required dependencies');
    return true;
  } catch (error) {
    console.error('Failed to update package.json:', error.message);
    return false;
  }
}

/**
 * Create test files for protocol connectors
 */
function createTestFiles() {
  try {
    const testsDir = path.join(process.cwd(), 'src', 'tests');
    const protocolsDir = path.join(testsDir, 'protocols');
    const walletDir = path.join(testsDir, 'wallet');
    
    // Create directories if they don't exist
    if (!fs.existsSync(testsDir)) {
      fs.mkdirSync(testsDir, { recursive: true });
    }
    
    if (!fs.existsSync(protocolsDir)) {
      fs.mkdirSync(protocolsDir, { recursive: true });
    }
    
    if (!fs.existsSync(walletDir)) {
      fs.mkdirSync(walletDir, { recursive: true });
    }
    
    // Create test files
    const testFiles = [
      { 
        path: path.join(protocolsDir, 'gmx-connector.test.ts'),
        content: `import { GmxConnector } from '../../../services/defi/connectors/gmx-connector';
import { ProtocolType, ProtocolAction } from '../../../types/defi-protocol-types';

describe('GMX Connector', () => {
  let connector: GmxConnector;

  beforeEach(() => {
    connector = new GmxConnector();
  });

  test('should initialize with default chainId', () => {
    expect(connector).toBeDefined();
  });

  test('should get protocol info', async () => {
    const info = await connector.getProtocolInfo();
    expect(info.name).toBe('GMX');
    expect(info.type).toBe(ProtocolType.GMX);
  });

  test('should get available actions', async () => {
    const actions = await connector.getAvailableActions();
    expect(actions).toContain(ProtocolAction.OPEN_POSITION);
    expect(actions).toContain(ProtocolAction.CLOSE_POSITION);
  });
});`
      },
      { 
        path: path.join(protocolsDir, 'uniswap-connector.test.ts'),
        content: `import { UniswapConnector } from '../../../services/defi/connectors/uniswap-connector';
import { ProtocolType, ProtocolAction } from '../../../types/defi-protocol-types';

describe('Uniswap Connector', () => {
  let connector: UniswapConnector;

  beforeEach(() => {
    connector = new UniswapConnector();
  });

  test('should initialize with default chainId', () => {
    expect(connector).toBeDefined();
  });

  test('should get protocol info', async () => {
    const info = await connector.getProtocolInfo();
    expect(info.name).toBe('Uniswap');
    expect(info.type).toBe(ProtocolType.UNISWAP);
  });

  test('should get available actions', async () => {
    const actions = await connector.getAvailableActions();
    expect(actions).toContain(ProtocolAction.SWAP);
  });
});`
      },
      { 
        path: path.join(protocolsDir, 'cross-protocol-aggregator.test.ts'),
        content: `import { CrossProtocolAggregator } from '../../../services/defi/cross-protocol-aggregator';
import { ProtocolType } from '../../../types/defi-protocol-types';

describe('Cross Protocol Aggregator', () => {
  let aggregator: CrossProtocolAggregator;

  beforeEach(() => {
    aggregator = CrossProtocolAggregator.getInstance();
  });

  test('should be a singleton instance', () => {
    const instance2 = CrossProtocolAggregator.getInstance();
    expect(aggregator).toBe(instance2);
  });

  test('should get supported protocols', async () => {
    const protocols = aggregator.getSupportedProtocols();
    expect(protocols).toContain(ProtocolType.UNISWAP);
    expect(protocols).toContain(ProtocolType.AAVE);
  });
});`
      },
      { 
        path: path.join(walletDir, 'wallet-provider.test.ts'),
        content: `import { WalletProvider, WalletType } from '../../../services/wallet/wallet-provider';

describe('Wallet Provider', () => {
  let walletProvider: WalletProvider;

  beforeEach(() => {
    walletProvider = WalletProvider.getInstance();
  });

  test('should be a singleton instance', () => {
    const instance2 = WalletProvider.getInstance();
    expect(walletProvider).toBe(instance2);
  });

  test('should return null wallet info when not connected', () => {
    const walletInfo = walletProvider.getWalletInfo();
    expect(walletInfo).toBeNull();
  });
});`
      }
    ];
    
    // Write test files
    testFiles.forEach(file => {
      fs.writeFileSync(file.path, file.content);
      console.log(`✅ Created test file: ${file.path}`);
    });
    
    return true;
  } catch (error) {
    console.error('Failed to create test files:', error.message);
    return false;
  }
}

// Run the script
(async () => {
  if (updatePackageJson()) {
    await installDependencies();
    
    // Create test files
    createTestFiles();
  }
})(); 