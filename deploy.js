const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying RecursivesTestnet contract...");
  
  // Get the contract factory
  const Recursives = await ethers.getContractFactory("Recursives");
  
  // Collection parameters
  const name = "RecursivesTestnet"; // Proxy name for testnet
  const symbol = "RECTEST";
  const baseURI = "ipfs://QmYourBaseURIHashGoesHere/"; // Will be updated after IPFS upload
  const notRevealedURI = "ipfs://QmYourPlaceholderURIHashGoesHere/hidden.json";
  
  // Deploy the contract
  const recursives = await Recursives.deploy(
    name,
    symbol,
    baseURI,
    notRevealedURI
  );
  
  // Wait for deployment
  await recursives.deployed();
  
  console.log(`Recursives deployed to: ${recursives.address}`);
  console.log(`Name: ${name}`);
  console.log(`Symbol: ${symbol}`);
  
  // Verify contract if not on localhost
  if (network.name !== "localhost" && network.name !== "hardhat") {
    console.log("Waiting for 5 block confirmations before verification...");
    await recursives.deployTransaction.wait(5);
    
    console.log("Verifying contract on Etherscan...");
    await hre.run("verify:verify", {
      address: recursives.address,
      constructorArguments: [name, symbol, baseURI, notRevealedURI],
    });
    console.log("Contract verified!");
  }
  
  // Output contract details
  console.log("\nContract Setup Information:");
  console.log("---------------------------");
  console.log(`- Max Supply: ${await recursives.MAX_SUPPLY()}`);
  console.log(`- Public Mint Price: ${ethers.utils.formatEther(await recursives.mintPrice())} ETH`);
  console.log(`- Whitelist Price: ${ethers.utils.formatEther(await recursives.whitelistPrice())} ETH`);
  console.log(`- Max Per Wallet: ${await recursives.MAX_PER_WALLET()}`);
  console.log(`- Reserved Tokens: ${await recursives.reservedTokens()}`);
  console.log(`- Revealed: ${await recursives.revealed()}`);
  
  return recursives;
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  }); 