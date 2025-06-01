/**
 * Test Contract Integration Script
 * 
 * This script tests the integration between the SONIC token and the NFT contract
 * by simulating the full process of:
 * 1. Approving SONIC tokens
 * 2. Minting NFTs
 * 3. Checking metadata
 * 
 * Usage:
 * node scripts/test-contract-integration.js <quantity>
 */

require('dotenv').config({ path: '.env.local' });
const { ethers } = require('ethers');

// NFT Contract ABI
const SONIC_NFT_ABI = [
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
  "function supportsInterface(bytes4 interfaceId) external view returns (bool)",
  "function royaltyInfo(uint256 _tokenId, uint256 _salePrice) external view returns (address, uint256)",
];

// SONIC Token ABI
const SONIC_TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
];

async function main() {
  try {
    // Get quantity from command line (default to 1)
    const quantity = process.argv[2] ? parseInt(process.argv[2]) : 1;
    if (isNaN(quantity) || quantity <= 0) {
      console.error("Please provide a valid quantity (positive number)");
      process.exit(1);
    }
    
    // Connect to the Sonic blockchain
    const provider = new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_SONIC_RPC_URL);
    
    // Create wallet from private key
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`Connected with wallet: ${wallet.address}`);
    
    // Get contract addresses
    const nftAddress = process.env.NEXT_PUBLIC_SONIC_NFT_ADDRESS;
    const tokenAddress = process.env.NEXT_PUBLIC_SONIC_TOKEN_ADDRESS;
    
    if (!nftAddress || !tokenAddress) {
      throw new Error("NFT or Token address not set in environment");
    }
    
    console.log(`NFT Contract: ${nftAddress}`);
    console.log(`Token Contract: ${tokenAddress}`);
    
    // Create contract instances
    const nftContract = new ethers.Contract(nftAddress, SONIC_NFT_ABI, wallet);
    const tokenContract = new ethers.Contract(tokenAddress, SONIC_TOKEN_ABI, wallet);
    
    // Get token info
    const tokenSymbol = await tokenContract.symbol();
    const tokenDecimals = await tokenContract.decimals();
    
    // Get NFT info
    const totalSupply = await nftContract.totalSupply();
    const maxSupply = await nftContract.maxSupply();
    const mintPrice = await nftContract.mintPrice();
    const maxPerWallet = await nftContract.maxPerWallet();
    const mintedByUser = await nftContract.mintedByAddress(wallet.address);
    const isRevealed = await nftContract.revealed();
    
    console.log("\nNFT Collection Info:");
    console.log(`Total Supply: ${totalSupply}/${maxSupply}`);
    console.log(`Price per NFT: ${ethers.utils.formatUnits(mintPrice, tokenDecimals)} ${tokenSymbol}`);
    console.log(`Max per wallet: ${maxPerWallet}`);
    console.log(`Already minted by you: ${mintedByUser}`);
    console.log(`Collection revealed: ${isRevealed}`);
    
    // Check royalty implementation
    console.log("\nChecking royalty implementation:");
    // ERC-2981 interface ID
    const supportsRoyalty = await nftContract.supportsInterface("0x2a55205a");
    console.log(`Supports ERC-2981 royalty standard: ${supportsRoyalty ? 'Yes' : 'No'}`);
    
    if (supportsRoyalty) {
      // Test royalty info with example sale price of 1000 SONIC
      const salePrice = ethers.utils.parseUnits("1000", tokenDecimals);
      const [receiver, royaltyAmount] = await nftContract.royaltyInfo(0, salePrice);
      
      // Calculate royalty percentage
      const royaltyPercentage = (Number(ethers.utils.formatUnits(royaltyAmount, tokenDecimals)) / 
                               Number(ethers.utils.formatUnits(salePrice, tokenDecimals))) * 100;
      
      console.log(`Royalty Receiver: ${receiver}`);
      console.log(`Royalty Amount: ${ethers.utils.formatUnits(royaltyAmount, tokenDecimals)} ${tokenSymbol} for a ${ethers.utils.formatUnits(salePrice, tokenDecimals)} ${tokenSymbol} sale`);
      console.log(`Royalty Percentage: ${royaltyPercentage.toFixed(2)}%`);
    }
    
    // Check if user can mint the requested quantity
    if (mintedByUser.add(quantity).gt(maxPerWallet)) {
      throw new Error(`Cannot mint ${quantity} NFTs. Would exceed max per wallet (${maxPerWallet})`);
    }
    
    // Calculate total price
    const totalPrice = mintPrice.mul(quantity);
    console.log(`Total cost for ${quantity} NFTs: ${ethers.utils.formatUnits(totalPrice, tokenDecimals)} ${tokenSymbol}`);
    
    // Check user's token balance
    const balance = await tokenContract.balanceOf(wallet.address);
    console.log(`Your ${tokenSymbol} balance: ${ethers.utils.formatUnits(balance, tokenDecimals)}`);
    
    if (balance.lt(totalPrice)) {
      throw new Error(`Insufficient ${tokenSymbol} balance. Need ${ethers.utils.formatUnits(totalPrice, tokenDecimals)}, have ${ethers.utils.formatUnits(balance, tokenDecimals)}`);
    }
    
    // Check current allowance
    const allowance = await tokenContract.allowance(wallet.address, nftAddress);
    console.log(`Current allowance for NFT contract: ${ethers.utils.formatUnits(allowance, tokenDecimals)} ${tokenSymbol}`);
    
    // Approve tokens if needed
    if (allowance.lt(totalPrice)) {
      console.log(`\nApproving ${ethers.utils.formatUnits(totalPrice, tokenDecimals)} ${tokenSymbol} for the NFT contract...`);
      const approveTx = await tokenContract.approve(nftAddress, totalPrice);
      console.log(`Approval transaction: ${approveTx.hash}`);
      console.log("Waiting for confirmation...");
      await approveTx.wait();
      console.log("Approval confirmed!");
      
      // Verify new allowance
      const newAllowance = await tokenContract.allowance(wallet.address, nftAddress);
      console.log(`New allowance: ${ethers.utils.formatUnits(newAllowance, tokenDecimals)} ${tokenSymbol}`);
    } else {
      console.log("Sufficient allowance already granted.");
    }
    
    // Mint NFTs
    console.log(`\nMinting ${quantity} NFTs...`);
    const mintTx = await nftContract.mint(quantity);
    console.log(`Mint transaction: ${mintTx.hash}`);
    console.log("Waiting for confirmation...");
    await mintTx.wait();
    console.log("Minting confirmed!");
    
    // Check new NFT balance
    const newMintedByUser = await nftContract.mintedByAddress(wallet.address);
    console.log(`\nNew NFT count owned by you: ${newMintedByUser}`);
    
    // Check new token balance
    const newBalance = await tokenContract.balanceOf(wallet.address);
    console.log(`New ${tokenSymbol} balance: ${ethers.utils.formatUnits(newBalance, tokenDecimals)}`);
    
    // Show spent amount
    const spent = balance.sub(newBalance);
    console.log(`Spent: ${ethers.utils.formatUnits(spent, tokenDecimals)} ${tokenSymbol}`);
    
    // Check token URI for newly minted token
    console.log("\nChecking metadata for the newly minted token:");
    
    // Get the first token ID owned by the user (this is a simplification)
    const tokenId = totalSupply; // This assumes totalSupply was the first ID minted
    
    try {
      const uri = await nftContract.tokenURI(tokenId);
      console.log(`Token URI for ID ${tokenId}: ${uri}`);
      
      if (isRevealed) {
        console.log("Collection is revealed - URI should point to specific token metadata");
      } else {
        console.log("Collection is not revealed - URI should point to placeholder metadata");
      }
      
      // Instructions for viewing metadata
      console.log("\nTo view metadata:");
      console.log(`1. If using IPFS URI (ipfs://...), visit https://gateway.pinata.cloud/ipfs/${uri.replace('ipfs://', '')}`);
      console.log("2. Verify the metadata includes name, description, image, and attributes");
      console.log("3. Ensure the image URL is accessible");
    } catch (error) {
      console.error(`Error retrieving token URI: ${error.message}`);
    }
    
    console.log("\nIntegration test completed successfully!");
    console.log("\nNext Steps:");
    console.log("1. Ensure your metadata is correctly formatted for PaintSwap");
    console.log("2. Upload your artwork and metadata to IPFS");
    console.log("3. Update the contract with your IPFS CIDs");
    console.log("4. When ready, reveal your collection with: await nftContract.setRevealed(true)");
    console.log("5. Submit your collection to PaintSwap");
    
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