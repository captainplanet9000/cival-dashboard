const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  // Collection parameters
  const name = "Sonic NFT Collection";
  const symbol = "SONIC";
  const baseURI = "ipfs://INSERT_YOUR_REVEALED_CID_HERE/";
  const notRevealedURI = "ipfs://INSERT_YOUR_PLACEHOLDER_CID_HERE/hidden.json";

  console.log("Deploying SonicNFT contract to Sonic Network Testnet...");
  
  // Get the ContractFactory
  const SonicNFT = await ethers.getContractFactory("SonicNFT");
  
  // Deploy the contract
  const sonicNFT = await SonicNFT.deploy(name, symbol, baseURI, notRevealedURI);
  
  // Wait for deployment to finish
  await sonicNFT.deployed();
  
  console.log(`SonicNFT deployed to Testnet at: ${sonicNFT.address}`);
  console.log("Testnet deployment complete!");
  
  // Add contract address to a local file for reference
  const fs = require('fs');
  fs.writeFileSync(
    'deployed-testnet-address.txt', 
    `Deployed to: ${sonicNFT.address}\nDeployed at: ${new Date().toISOString()}\n`, 
    { flag: 'w' }
  );
  
  console.log("Contract address saved to deployed-testnet-address.txt");
  
  // Deployment verification instructions
  console.log("\nTo verify the contract on Testnet Explorer:");
  console.log(`npx hardhat verify --network sonictestnet ${sonicNFT.address} "${name}" "${symbol}" "${baseURI}" "${notRevealedURI}"`);
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 