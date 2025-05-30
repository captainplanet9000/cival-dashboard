const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  // Get new base URI from command line or set default
  const newBaseURI = process.argv[2] || 'ipfs://INSERT_YOUR_REVEALED_CID_HERE/';
  
  if (!newBaseURI.startsWith('ipfs://')) {
    console.warn('WARNING: Base URI should typically start with ipfs://');
    // Give the user a chance to abort
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const response = await new Promise(resolve => {
      readline.question('Continue anyway? (y/n): ', resolve);
    });
    
    readline.close();
    
    if (response.toLowerCase() !== 'y') {
      console.log('Aborting setBaseURI script');
      return;
    }
  }
  
  console.log(`Setting base URI to: ${newBaseURI}`);
  
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
  
  // Set the base URI
  const tx = await sonicNFT.setBaseURI(newBaseURI);
  console.log(`Transaction hash: ${tx.hash}`);
  
  // Wait for transaction to be mined
  await tx.wait();
  
  console.log('Base URI successfully updated!');
  console.log('You can now run the revealCollection script to reveal the NFTs.');
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 