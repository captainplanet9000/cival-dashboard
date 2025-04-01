const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  // Get the desired state from command line or prompt user
  let desiredState;
  
  if (process.argv.length > 2) {
    const arg = process.argv[2].toLowerCase();
    if (arg === 'true' || arg === 'on' || arg === '1') {
      desiredState = true;
    } else if (arg === 'false' || arg === 'off' || arg === '0') {
      desiredState = false;
    }
  }
  
  if (desiredState === undefined) {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const response = await new Promise(resolve => {
      readline.question('Enable minting? (y/n): ', resolve);
    });
    
    readline.close();
    
    desiredState = response.toLowerCase() === 'y';
  }
  
  console.log(`Setting minting active status to: ${desiredState}`);
  
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
  
  // Check current state
  const currentState = await sonicNFT.mintingActive();
  
  if (currentState === desiredState) {
    console.log(`Minting is already ${desiredState ? 'active' : 'inactive'}. No changes needed.`);
    return;
  }
  
  // Set the minting state
  const tx = await sonicNFT.setMintingActive(desiredState);
  console.log(`Transaction hash: ${tx.hash}`);
  
  // Wait for transaction to be mined
  await tx.wait();
  
  console.log(`Minting has been successfully ${desiredState ? 'activated' : 'deactivated'}!`);
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 