/**
 * IPFS Upload Script for Sonic NFT Collection
 * 
 * This script uploads generated NFT images and metadata to IPFS
 * using the Pinata API, then updates the contract with the base URI.
 * 
 * Prerequisites:
 * - Node.js installed
 * - Images in assets/images folder
 * - Metadata in assets/metadata folder
 * - Pinata API keys (get from https://pinata.cloud)
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { ethers } = require("hardhat");
require('dotenv').config();

// Configure Pinata API
const pinataApiKey = process.env.PINATA_API_KEY;
const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;
const pinataUrl = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

// Configure paths
const imagesDir = path.join(__dirname, '../assets/images');
const metadataDir = path.join(__dirname, '../assets/metadata');
const updatedMetadataDir = path.join(__dirname, '../assets/metadata_updated');

// Contract address (replace with your deployed contract)
const contractAddress = process.env.CONTRACT_ADDRESS;

/**
 * Uploads a file to IPFS via Pinata
 * @param {string} filePath - Path to the file
 * @param {string} fileName - Name to use in IPFS
 * @returns {Promise<string>} - IPFS CID (Content ID)
 */
async function uploadToIPFS(filePath, fileName) {
  const formData = new FormData();
  
  // Add the file to form data
  const file = fs.createReadStream(filePath);
  formData.append('file', file);
  
  // Add pinata metadata
  const metadata = JSON.stringify({
    name: fileName,
  });
  formData.append('pinataMetadata', metadata);
  
  try {
    const response = await axios.post(pinataUrl, formData, {
      maxBodyLength: 'Infinity',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
        pinata_api_key: pinataApiKey,
        pinata_secret_api_key: pinataSecretApiKey
      }
    });
    
    console.log(`Successfully uploaded ${fileName} to IPFS with CID: ${response.data.IpfsHash}`);
    return response.data.IpfsHash;
  } catch (error) {
    console.error(`Error uploading ${fileName} to IPFS:`, error.message);
    throw error;
  }
}

/**
 * Uploads a directory to IPFS via Pinata
 * @param {string} dirPath - Path to the directory
 * @param {string} dirName - Name for the directory in IPFS
 * @returns {Promise<string>} - IPFS CID (Content ID)
 */
async function uploadDirectoryToIPFS(dirPath, dirName) {
  const formData = new FormData();
  
  // Recursively add all files in the directory
  const files = getFilesRecursively(dirPath);
  
  for (const filePath of files) {
    const relativePath = path.relative(dirPath, filePath);
    const file = fs.createReadStream(filePath);
    formData.append('file', file, { filepath: relativePath });
  }
  
  // Add pinata metadata
  const metadata = JSON.stringify({
    name: dirName,
  });
  formData.append('pinataMetadata', metadata);
  
  try {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        maxBodyLength: 'Infinity',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretApiKey
        }
      }
    );
    
    console.log(`Successfully uploaded directory ${dirName} to IPFS with CID: ${response.data.IpfsHash}`);
    return response.data.IpfsHash;
  } catch (error) {
    console.error(`Error uploading directory ${dirName} to IPFS:`, error.message);
    throw error;
  }
}

/**
 * Get all files in a directory recursively
 * @param {string} dir - Directory path
 * @returns {Array<string>} - Array of file paths
 */
function getFilesRecursively(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      // Recursively get files from subdirectories
      results = results.concat(getFilesRecursively(filePath));
    } else {
      results.push(filePath);
    }
  }
  
  return results;
}

/**
 * Updates the metadata files with correct IPFS image links
 * @param {string} metadataDir - Metadata directory
 * @param {string} imagesCID - IPFS CID for images directory
 * @returns {Promise<void>}
 */
async function updateMetadataWithImageLinks(metadataDir, imagesCID) {
  // Create the updated metadata directory if it doesn't exist
  if (!fs.existsSync(updatedMetadataDir)) {
    fs.mkdirSync(updatedMetadataDir, { recursive: true });
  }
  
  const files = fs.readdirSync(metadataDir);
  
  for (const file of files) {
    if (file.endsWith('.json') && file !== 'collection_info.json') {
      const filePath = path.join(metadataDir, file);
      const metadata = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Update the image URI with the actual IPFS path
      metadata.image = metadata.image.replace('TOKEN_CID_PLACEHOLDER', imagesCID);
      
      // Write the updated metadata to the new directory
      const updatedFilePath = path.join(updatedMetadataDir, file);
      fs.writeFileSync(updatedFilePath, JSON.stringify(metadata, null, 2));
      
      console.log(`Updated metadata for ${file}`);
    } else if (file === 'collection_info.json') {
      // Also copy and update the collection info file
      const filePath = path.join(metadataDir, file);
      const collectionInfo = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Update any image paths in the collection info
      if (collectionInfo.items) {
        for (const item of collectionInfo.items) {
          if (item.image_path && item.image_path.includes('TOKEN_CID_PLACEHOLDER')) {
            item.image_path = item.image_path.replace('TOKEN_CID_PLACEHOLDER', imagesCID);
          }
        }
      }
      
      // Add the IPFS CIDs to the collection info
      collectionInfo.imagesCID = imagesCID;
      
      // Write the updated collection info to the new directory
      const updatedFilePath = path.join(updatedMetadataDir, file);
      fs.writeFileSync(updatedFilePath, JSON.stringify(collectionInfo, null, 2));
      
      console.log('Updated collection info with IPFS CIDs');
    }
  }
}

/**
 * Updates the smart contract with the base URI
 * @param {string} metadataCID - IPFS CID for metadata
 * @returns {Promise<void>}
 */
async function updateContractBaseURI(metadataCID) {
  if (!contractAddress) {
    console.log('No contract address provided. Skipping contract update.');
    return;
  }
  
  try {
    // Get the signer
    const [deployer] = await ethers.getSigners();
    
    // Get the contract instance
    const SonicNFT = await ethers.getContractFactory("SonicNFT");
    const contract = SonicNFT.attach(contractAddress);
    
    // Create the base URI
    const baseURI = `ipfs://${metadataCID}/`;
    
    // Update the contract
    console.log(`Updating contract base URI to: ${baseURI}`);
    const tx = await contract.connect(deployer).setBaseURI(baseURI);
    
    // Wait for the transaction to be confirmed
    console.log('Waiting for transaction confirmation...');
    await tx.wait();
    
    console.log(`Contract base URI updated successfully! Transaction: ${tx.hash}`);
  } catch (error) {
    console.error('Error updating contract base URI:', error);
  }
}

/**
 * Main function to upload NFT collection to IPFS
 */
async function main() {
  try {
    console.log('Starting IPFS upload process...');
    
    // Check if required directories exist
    if (!fs.existsSync(imagesDir)) {
      console.error(`Images directory not found: ${imagesDir}`);
      return;
    }
    
    if (!fs.existsSync(metadataDir)) {
      console.error(`Metadata directory not found: ${metadataDir}`);
      return;
    }
    
    // Check if Pinata API keys are configured
    if (!pinataApiKey || !pinataSecretApiKey) {
      console.error('Pinata API keys not configured. Please set PINATA_API_KEY and PINATA_SECRET_API_KEY in your .env file.');
      return;
    }
    
    // Upload all images
    console.log('Uploading images to IPFS...');
    const imagesCID = await uploadDirectoryToIPFS(imagesDir, 'SonicNFT_Images');
    
    // Update metadata with correct image links
    console.log('Updating metadata with IPFS image links...');
    await updateMetadataWithImageLinks(metadataDir, imagesCID);
    
    // Upload updated metadata
    console.log('Uploading updated metadata to IPFS...');
    const metadataCID = await uploadDirectoryToIPFS(updatedMetadataDir, 'SonicNFT_Metadata');
    
    // Save the CIDs to a file for reference
    const cidsInfo = {
      images: imagesCID,
      metadata: metadataCID,
      baseURI: `ipfs://${metadataCID}/`,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../assets/ipfs_cids.json'),
      JSON.stringify(cidsInfo, null, 2)
    );
    
    console.log('\nIPFS Upload Summary:');
    console.log(`Images CID: ${imagesCID}`);
    console.log(`Metadata CID: ${metadataCID}`);
    console.log(`Base URI for contract: ipfs://${metadataCID}/`);
    console.log('CIDs saved to assets/ipfs_cids.json');
    
    // Update contract if address is provided
    if (contractAddress) {
      console.log('\nUpdating contract with new base URI...');
      await updateContractBaseURI(metadataCID);
    } else {
      console.log('\nNo contract address provided. To update the contract, set CONTRACT_ADDRESS in your .env file and run this script again.');
    }
    
    console.log('\nUpload process completed successfully!');
  } catch (error) {
    console.error('Error in upload process:', error);
  }
}

// Execute the upload process
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 