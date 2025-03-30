require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

// This is a sample Hardhat task. To learn how to create your own, check out
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// Get environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const SONIC_TESTNET_URL = process.env.SONIC_TESTNET_URL || "https://testnet.sonic.app/rpc";
const SONIC_MAINNET_URL = process.env.SONIC_MAINNET_URL || "https://mainnet.sonic.app/rpc";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
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
    sonic_testnet: {
      url: SONIC_TESTNET_URL,
      accounts: [PRIVATE_KEY],
      gasPrice: 5000000000, // 5 gwei
      chainId: 59141, // Sonic testnet chain ID
    },
    sonic: {
      url: SONIC_MAINNET_URL,
      accounts: [PRIVATE_KEY],
      gasPrice: 5000000000, // 5 gwei
      chainId: 59144, // Sonic mainnet chain ID
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
    // Custom configuration for Sonic blockchain explorer
    customChains: [
      {
        network: "sonic",
        chainId: 59144,
        urls: {
          apiURL: "https://explorer.sonic.app/api",
          browserURL: "https://explorer.sonic.app",
        },
      },
      {
        network: "sonic_testnet",
        chainId: 59141,
        urls: {
          apiURL: "https://testnet-explorer.sonic.app/api",
          browserURL: "https://testnet-explorer.sonic.app",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 20000,
  },
}; 