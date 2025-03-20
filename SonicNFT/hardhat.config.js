/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-etherscan');
require('dotenv').config();

const { PRIVATE_KEY, SONIC_RPC_URL, ETHERSCAN_API_KEY } = process.env;

// Default to prevent errors if env variables not set
const privateKey = PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000';
const sonicRpcUrl = SONIC_RPC_URL || 'https://sonic.rpc.placeholder.url';

module.exports = {
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
    },
    sonic_testnet: {
      url: sonicRpcUrl.includes('testnet') ? sonicRpcUrl : 'https://testnet.sonic.rpc.url',
      accounts: [privateKey],
      gasPrice: 5000000000, // 5 gwei
    },
    sonic: {
      url: sonicRpcUrl,
      accounts: [privateKey],
      gasPrice: 5000000000, // 5 gwei
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
    // For Sonic, might need custom explorer settings
    customChains: [
      {
        network: 'sonic',
        chainId: 59144, // Replace with actual Sonic ChainID
        urls: {
          apiURL: 'https://sonic-explorer-api.placeholder/api',
          browserURL: 'https://sonic-explorer.placeholder',
        },
      },
      {
        network: 'sonic_testnet',
        chainId: 59143, // Replace with actual Sonic Testnet ChainID
        urls: {
          apiURL: 'https://sonic-testnet-explorer-api.placeholder/api',
          browserURL: 'https://sonic-testnet-explorer.placeholder',
        },
      },
    ],
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  mocha: {
    timeout: 20000,
  },
}; 