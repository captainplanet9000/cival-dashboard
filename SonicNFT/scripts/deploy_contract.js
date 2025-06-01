const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment process...");

  // Get the contract factory
  const SonicNFT = await ethers.getContractFactory("SonicNFT");

  // Collection parameters
  const collectionName = "Sonic Generative Art";
  const collectionSymbol = "SONIC";
  const baseURI = "ipfs://"; // Will be updated after IPFS upload

  console.log(`Deploying SonicNFT with the following parameters:
  - Name: ${collectionName}
  - Symbol: ${collectionSymbol}
  - Base URI: ${baseURI} (will be updated after metadata upload)`);

  // Deploy the contract
  const sonicNFT = await SonicNFT.deploy(
    collectionName, 
    collectionSymbol, 
    baseURI
  );

  // Wait for deployment to finish
  await sonicNFT.deployed();

  console.log(`SonicNFT deployed to: ${sonicNFT.address}`);
  console.log("Deployment completed successfully!");

  // Verify contract on block explorer if not on a local network
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Waiting for block confirmation...");
    
    // Wait for 6 block confirmations
    await sonicNFT.deployTransaction.wait(6);
    
    console.log("Starting contract verification...");
    
    // Verify the contract on the block explorer
    await hre.run("verify:verify", {
      address: sonicNFT.address,
      constructorArguments: [
        collectionName, 
        collectionSymbol, 
        baseURI
      ],
    });
    
    console.log("Contract verification completed!");
  }

  return sonicNFT;
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  }); 