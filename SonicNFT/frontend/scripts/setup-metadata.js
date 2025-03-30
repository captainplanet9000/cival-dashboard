/**
 * Setup Metadata Script
 * 
 * This script helps set up metadata URIs for your NFT collection.
 * Use after deploying the contract to configure the base URI and reveal state.
 * 
 * Usage:
 * - To set unrevealed URI: node scripts/setup-metadata.js unrevealed ipfs://YourUnrevealedCID/unrevealed.json
 * - To set base URI: node scripts/setup-metadata.js baseuri ipfs://YourMetadataCID/
 * - To reveal collection: node scripts/setup-metadata.js reveal true
 */

require('dotenv').config({ path: '.env.local' });
const { ethers } = require('ethers');

// NFT Contract ABI (metadata-related functions only)
const NFT_CONTRACT_ABI = [
  "function revealed() external view returns (bool)",
  "function setRevealed(bool _revealed) external",
  "function setBaseURI(string memory _newBaseURI) external",
  "function setNotRevealedURI(string memory _newNotRevealedURI) external",
  "function setUriSuffix(string memory _newUriSuffix) external",
  "function tokenURI(uint256 _tokenId) external view returns (string memory)"
];

async function main() {
  try {
    // Get command line arguments
    const command = process.argv[2]?.toLowerCase();
    const value = process.argv[3];
    
    if (!command || !value) {
      console.error("Missing command or value. Usage examples:");
      console.error("- To set unrevealed URI: node scripts/setup-metadata.js unrevealed ipfs://YourUnrevealedCID/unrevealed.json");
      console.error("- To set base URI: node scripts/setup-metadata.js baseuri ipfs://YourMetadataCID/");
      console.error("- To reveal collection: node scripts/setup-metadata.js reveal true");
      process.exit(1);
    }
    
    // Connect to the Sonic blockchain
    const provider = new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_SONIC_RPC_URL);
    
    // Create wallet from private key
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`Connected with wallet: ${wallet.address}`);
    
    // Get NFT contract address
    const nftAddress = process.env.NEXT_PUBLIC_SONIC_NFT_ADDRESS;
    if (!nftAddress) {
      throw new Error("NFT contract address not set in environment (NEXT_PUBLIC_SONIC_NFT_ADDRESS)");
    }
    
    console.log(`NFT Contract: ${nftAddress}`);
    
    // Create contract instance
    const nftContract = new ethers.Contract(nftAddress, NFT_CONTRACT_ABI, wallet);
    
    // Check current reveal state
    const isRevealed = await nftContract.revealed();
    console.log(`Current reveal state: ${isRevealed ? 'Revealed' : 'Not Revealed'}`);
    
    // Execute command
    let tx;
    switch (command) {
      case 'unrevealed':
      case 'notrevealed':
        console.log(`Setting unrevealed URI to: ${value}`);
        tx = await nftContract.setNotRevealedURI(value);
        break;
        
      case 'baseuri':
      case 'base':
        console.log(`Setting base URI to: ${value}`);
        tx = await nftContract.setBaseURI(value);
        break;
        
      case 'reveal':
      case 'revealed':
        const revealValue = value.toLowerCase() === 'true';
        console.log(`Setting revealed state to: ${revealValue}`);
        tx = await nftContract.setRevealed(revealValue);
        break;
        
      case 'suffix':
      case 'urisuffix':
        console.log(`Setting URI suffix to: ${value}`);
        tx = await nftContract.setUriSuffix(value);
        break;
        
      case 'test':
        // Test tokenURI function
        const tokenId = parseInt(value);
        if (isNaN(tokenId)) {
          throw new Error("Test command requires a valid token ID number");
        }
        const uri = await nftContract.tokenURI(tokenId);
        console.log(`Token URI for ID ${tokenId}: ${uri}`);
        return;
        
      default:
        throw new Error(`Unknown command: ${command}`);
    }
    
    // Wait for transaction
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for confirmation...");
    await tx.wait();
    console.log("Transaction confirmed!");
    
    // Verify changes if it's a reveal command
    if (command === 'reveal' || command === 'revealed') {
      const newRevealState = await nftContract.revealed();
      console.log(`New reveal state: ${newRevealState ? 'Revealed' : 'Not Revealed'}`);
    }
    
    console.log("\nMetadata setup complete!");
    console.log("\nNext Steps:");
    console.log("1. If you've set all URIs and are ready to reveal:");
    console.log("   node scripts/setup-metadata.js reveal true");
    console.log("2. Test your metadata with:");
    console.log("   node scripts/setup-metadata.js test 0");
    
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 