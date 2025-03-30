const { ethers } = require("hardhat");

async function main() {
  // Collection parameters
  const name = "Sonic NFT Collection";
  const symbol = "SONIC";
  const baseURI = "ipfs://INSERT_YOUR_REVEALED_CID_HERE/";
  const notRevealedURI = "ipfs://INSERT_YOUR_PLACEHOLDER_CID_HERE/hidden.json";

  console.log("Deploying SonicNFT contract...");
  
  // Get the ContractFactory
  const SonicNFT = await ethers.getContractFactory("SonicNFT");
  
  // Deploy the contract
  const sonicNFT = await SonicNFT.deploy(name, symbol, baseURI, notRevealedURI);
  
  // Wait for deployment to finish
  await sonicNFT.deployed();
  
  console.log(`SonicNFT deployed to: ${sonicNFT.address}`);
  console.log("Deployment complete!");
  
  // Deployment verification instructions
  console.log("\nTo verify the contract on Etherscan or similar explorer:");
  console.log(`npx hardhat verify --network sonicnetwork ${sonicNFT.address} "${name}" "${symbol}" "${baseURI}" "${notRevealedURI}"`);
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 