/**
 * Deploy Test NFT Contract Script
 * 
 * This script deploys a test NFT contract to the Sonic blockchain.
 * It uses a 500 SONIC token fee for minting.
 * 
 * Prerequisites:
 * - Node.js 16+
 * - .env.local file with PRIVATE_KEY and NEXT_PUBLIC_SONIC_RPC_URL
 */

require('dotenv').config({ path: '.env.local' });
const { ethers } = require('ethers');

// Contract ABI and Bytecode
const NFT_CONTRACT_ABI = [
  "constructor(string memory _name, string memory _symbol, uint256 _maxSupply, uint256 _mintPrice, address _sonicTokenAddress)",
  "function mint(uint256 _quantity) external payable",
  "function totalSupply() external view returns (uint256)",
  "function maxSupply() external view returns (uint256)",
  "function maxPerWallet() external view returns (uint256)",
  "function mintedByAddress(address _address) external view returns (uint256)",
  "function mintPrice() external view returns (uint256)",
  "function tokenURI(uint256 _tokenId) external view returns (string memory)",
  "function revealed() external view returns (bool)",
  "function setRevealed(bool _revealed) external",
  "function setBaseURI(string memory _newBaseURI) external",
  "function setNotRevealedURI(string memory _newNotRevealedURI) external",
  "function setUriSuffix(string memory _newUriSuffix) external",
  "function supportsInterface(bytes4 interfaceId) external view returns (bool)",
  "function royaltyInfo(uint256 _tokenId, uint256 _salePrice) external view returns (address, uint256)",
  "function setSonicTokenAddress(address _sonicTokenAddress) external",
  "function setMaxPerWallet(uint256 _maxPerWallet) external",
  "function setDefaultRoyalty(address receiver, uint96 feeNumerator) external",
  "function withdraw() external",
];

// Simplified bytecode for a demo contract
const NFT_CONTRACT_BYTECODE = "0x608060405260..." // This would be the actual bytecode of your compiled contract

// Sample IPFS URIs
const SAMPLE_BASE_URI = "ipfs://QmYourMetadataCIDGoesHere/";
const SAMPLE_UNREVEALED_URI = "ipfs://QmYourUnrevealedImageCIDGoesHere/unrevealed.json";

async function main() {
  try {
    // Connect to the Sonic blockchain
    const provider = new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_SONIC_RPC_URL);
    
    // Create wallet from private key
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`Deploying contracts with the account: ${wallet.address}`);
    
    // Display balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`Account balance: ${ethers.utils.formatEther(balance)}`);
    
    // Get Sonic token address
    const sonicTokenAddress = process.env.NEXT_PUBLIC_SONIC_TOKEN_ADDRESS;
    if (!sonicTokenAddress) {
      throw new Error("SONIC token address not set in environment");
    }
    
    // Deploy the contract
    const ContractFactory = new ethers.ContractFactory(
      NFT_CONTRACT_ABI,
      NFT_CONTRACT_BYTECODE,
      wallet
    );
    
    // NFT Parameters
    const nftName = "Sonic NFT Collection";
    const nftSymbol = "SONIC";
    const maxSupply = 5000;
    const mintPrice = ethers.utils.parseUnits("500", 18); // 500 SONIC tokens
    
    console.log("Deploying Sonic NFT contract...");
    const contract = await ContractFactory.deploy(
      nftName,
      nftSymbol,
      maxSupply,
      mintPrice,
      sonicTokenAddress
    );
    
    await contract.deployed();
    console.log(`Sonic NFT contract deployed to: ${contract.address}`);
    
    // Set up metadata URIs
    console.log("\nSetting up metadata URIs...");
    
    // Set unrevealed URI
    console.log("Setting unrevealed URI...");
    await contract.setNotRevealedURI(SAMPLE_UNREVEALED_URI);
    console.log(`Unrevealed URI set to: ${SAMPLE_UNREVEALED_URI}`);
    
    // Set base URI (but keep revealed = false until ready)
    console.log("Setting base URI...");
    await contract.setBaseURI(SAMPLE_BASE_URI);
    console.log(`Base URI set to: ${SAMPLE_BASE_URI}`);
    
    // Check reveal status
    const isRevealed = await contract.revealed();
    console.log(`Collection revealed: ${isRevealed}`);
    console.log(`To reveal the collection later, run: await contract.setRevealed(true)`);
    
    // Verify ERC-2981 support
    console.log("\nVerifying ERC-2981 royalty support...");
    // ERC-2981 interface ID is 0x2a55205a
    const supportsRoyalty = await contract.supportsInterface("0x2a55205a");
    console.log(`Supports ERC-2981 royalty standard: ${supportsRoyalty ? 'Yes' : 'No'}`);
    
    if (supportsRoyalty) {
      // Retrieve royalty info for token ID 0 with a sale price of 1 ETH
      const salePrice = ethers.utils.parseEther("1");
      const [receiver, royaltyAmount] = await contract.royaltyInfo(0, salePrice);
      
      // Calculate royalty percentage
      const royaltyPercentage = (Number(royaltyAmount) / Number(salePrice)) * 100;
      
      console.log(`Royalty Receiver: ${receiver}`);
      console.log(`Royalty Amount: ${ethers.utils.formatEther(royaltyAmount)} ETH for a 1 ETH sale`);
      console.log(`Royalty Percentage: ${royaltyPercentage.toFixed(2)}%`);
    }
    
    // Test token URI
    console.log("\nTesting tokenURI function...");
    try {
      // This will revert since no tokens have been minted yet
      console.log("Note: Testing tokenURI(0) will fail until tokens are minted");
      // const uri = await contract.tokenURI(0);
      // console.log(`Token URI for ID 0: ${uri}`);
    } catch (error) {
      console.log("TokenURI test skipped (no tokens minted yet)");
    }
    
    // Add to environment
    console.log("\nAdd this to your .env.local file:");
    console.log(`NEXT_PUBLIC_SONIC_NFT_ADDRESS=${contract.address}`);
    
    // Verification information
    console.log("\nContract deployment completed!");
    console.log("Parameters:");
    console.log(`- Name: ${nftName}`);
    console.log(`- Symbol: ${nftSymbol}`);
    console.log(`- Max Supply: ${maxSupply}`);
    console.log(`- Mint Price: 500 SONIC tokens`);
    console.log(`- SONIC Token Address: ${sonicTokenAddress}`);
    console.log(`- Royalty: 7% to contract owner`);
    console.log(`- Metadata: Initially unrevealed, can be revealed later`);
    console.log(`- Base URI: ${SAMPLE_BASE_URI}`);
    console.log(`- Unrevealed URI: ${SAMPLE_UNREVEALED_URI}`);
    
    console.log("\nNext Steps:");
    console.log("1. Upload your artwork and metadata to IPFS");
    console.log("2. Update the base URI and unrevealed URI with your actual IPFS CIDs");
    console.log("3. When ready to reveal, call setRevealed(true)");
    console.log("4. Submit your collection to PaintSwap");
    
  } catch (error) {
    console.error("Error deploying contract:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 