/**
 * Mint Test SONIC Tokens Script
 * 
 * This script mints test SONIC tokens to a specified address for testing the NFT minting process.
 * It requires deploying a test ERC20 token first or using an existing testnet token.
 * 
 * Usage: 
 * node scripts/mint-test-tokens.js <recipient_address> <amount>
 */

require('dotenv').config({ path: '.env.local' });
const { ethers } = require('ethers');

// Standard ERC20 token with minting capabilities
const SONIC_TOKEN_ABI = [
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function main() {
  try {
    // Get recipient address from command line
    const recipient = process.argv[2];
    if (!recipient || !ethers.utils.isAddress(recipient)) {
      console.error("Please provide a valid recipient address");
      process.exit(1);
    }
    
    // Get amount from command line (default to 1000 tokens)
    const amount = process.argv[3] ? parseInt(process.argv[3]) : 1000;
    if (isNaN(amount) || amount <= 0) {
      console.error("Please provide a valid amount (positive number)");
      process.exit(1);
    }
    
    // Connect to the Sonic blockchain
    const provider = new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_SONIC_RPC_URL);
    
    // Create wallet from private key (must be the token contract owner/minter)
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`Connected with wallet: ${wallet.address}`);
    
    // Get Sonic token address
    const sonicTokenAddress = process.env.NEXT_PUBLIC_SONIC_TOKEN_ADDRESS;
    if (!sonicTokenAddress) {
      throw new Error("SONIC token address not set in environment");
    }
    
    // Create contract instance
    const tokenContract = new ethers.Contract(sonicTokenAddress, SONIC_TOKEN_ABI, wallet);
    
    // Get token info
    const tokenSymbol = await tokenContract.symbol();
    const tokenName = await tokenContract.name();
    const tokenDecimals = await tokenContract.decimals();
    
    console.log(`Token: ${tokenName} (${tokenSymbol})`);
    
    // Check if contract has mint function (for test tokens only)
    let hasMintFunction = false;
    try {
      // Check if the contract has a mint function by calling estimateGas
      await tokenContract.estimateGas.mint(recipient, ethers.utils.parseUnits(amount.toString(), tokenDecimals));
      hasMintFunction = true;
    } catch (error) {
      console.log("Contract doesn't have mint function. Will use transfer instead.");
    }
    
    // Check current balance
    const previousBalance = await tokenContract.balanceOf(recipient);
    console.log(`Previous ${tokenSymbol} balance: ${ethers.utils.formatUnits(previousBalance, tokenDecimals)}`);
    
    // Mint tokens or transfer from owner
    let tx;
    if (hasMintFunction) {
      console.log(`Minting ${amount} ${tokenSymbol} tokens to ${recipient}...`);
      tx = await tokenContract.mint(recipient, ethers.utils.parseUnits(amount.toString(), tokenDecimals));
    } else {
      console.log(`Transferring ${amount} ${tokenSymbol} tokens to ${recipient}...`);
      tx = await tokenContract.transfer(recipient, ethers.utils.parseUnits(amount.toString(), tokenDecimals));
    }
    
    // Wait for transaction to be mined
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for confirmation...");
    await tx.wait();
    console.log("Transaction confirmed!");
    
    // Check new balance
    const newBalance = await tokenContract.balanceOf(recipient);
    console.log(`New ${tokenSymbol} balance: ${ethers.utils.formatUnits(newBalance, tokenDecimals)}`);
    
    // Show increase
    const increase = newBalance.sub(previousBalance);
    console.log(`Increased by: ${ethers.utils.formatUnits(increase, tokenDecimals)} ${tokenSymbol}`);
    
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