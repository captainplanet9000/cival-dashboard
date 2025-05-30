require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Ensure you have these env variables in your .env file
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const SONIC_NETWORK_RPC_URL = process.env.SONIC_NETWORK_RPC_URL || "https://rpc.sonic.network";
const SONIC_TESTNET_RPC_URL = process.env.SONIC_TESTNET_RPC_URL || "https://testnet.rpc.sonic.network";
const SONIC_EXPLORER_API_KEY = process.env.SONIC_EXPLORER_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.17",
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
      url: "http://127.0.0.1:8545",
    },
    sonicnetwork: {
      url: SONIC_NETWORK_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 7700, // Replace with actual Sonic Network chain ID
      gas: 2100000,
      gasPrice: 8000000000, // 8 gwei
      timeout: 60000,
    },
    sonictestnet: {
      url: SONIC_TESTNET_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 7701, // Testnet chain ID (may need to be updated)
      gas: 2100000,
      gasPrice: 8000000000, // 8 gwei
      timeout: 60000,
    },
  },
  etherscan: {
    apiKey: {
      sonicnetwork: SONIC_EXPLORER_API_KEY,
      sonictestnet: SONIC_EXPLORER_API_KEY
    },
    customChains: [
      {
        network: "sonicnetwork",
        chainId: 7700, 
        urls: {
          apiURL: "https://explorer-api.sonic.network/api", 
          browserURL: "https://explorer.sonic.network" 
        }
      },
      {
        network: "sonictestnet",
        chainId: 7701, // Testnet chain ID (may need to be updated)
        urls: {
          apiURL: "https://testnet-explorer-api.sonic.network/api", // Replace with actual testnet URL
          browserURL: "https://testnet-explorer.sonic.network" // Replace with actual testnet URL
        }
      }
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
  }
}; 