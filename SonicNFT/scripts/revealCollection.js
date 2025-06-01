const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Initiating collection reveal...");
  
  // Get contract address from .env
  const contractAddress = process.env.NFT_CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    console.error('Error: NFT_CONTRACT_ADDRESS not set in .env file');
    return;
  }
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  // Get contract instance
  const SonicNFT = await ethers.getContractFactory("SonicNFT");
  const sonicNFT = await SonicNFT.attach(contractAddress);
  
  // Check if already revealed
  const isRevealed = await sonicNFT.revealed();
  if (isRevealed) {
    console.log('Collection is already revealed!');
    return;
  }
  
  // Confirm with user
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const response = await new Promise(resolve => {
    readline.question('This will reveal the entire collection. Are you sure? (y/n): ', resolve);
  });
  
  readline.close();
  
  if (response.toLowerCase() !== 'y') {
    console.log('Aborting reveal process');
    return;
  }
  
  // Reveal the collection
  const tx = await sonicNFT.revealCollection();
  console.log(`Transaction hash: ${tx.hash}`);
  
  // Wait for transaction to be mined
  await tx.wait();
  
  console.log('✨ Collection successfully revealed! ✨');
  console.log('All NFTs will now display their revealed artwork.');
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 