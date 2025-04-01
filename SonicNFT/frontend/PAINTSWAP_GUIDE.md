# PaintSwap Submission Guide

This guide walks you through the process of preparing your collection for PaintSwap and submitting it for verification.

## Metadata Preparation Checklist

Before submitting to PaintSwap, ensure your collection metadata is properly set up:

- [ ] Generate metadata files for all NFTs using `scripts/generate-metadata.js`
- [ ] Upload metadata files to IPFS (Pinata or NFT.Storage recommended)
- [ ] Set base URI in contract (`setBaseURI("ipfs://YourCID/")`)
- [ ] Set unrevealed URI for pre-reveal state (`setNotRevealedURI("ipfs://YourCID/unrevealed.json")`)
- [ ] Test metadata retrieval for at least one token ID
- [ ] Verify contract on SonicScan

## Required Metadata Format

Each NFT in your collection must have metadata in this format:

```json
{
  "name": "Sonic NFT #123",
  "description": "A unique generative art NFT...",
  "image": "ipfs://QmYourImageCID/123.png",
  "attributes": [
    {
      "trait_type": "Background",
      "value": "Cosmic"
    },
    ...
  ]
}
```

## Submission Process

1. **Prepare Collection Information**:
   - Collection Name: "Sonic NFT Collection"
   - Description: Focus on being the first generative art on Sonic blockchain
   - Collection Image: Create a high-quality banner (1400x350px recommended)
   - Collection Logo: Square logo (500x500px recommended)
   - Social Links: Twitter, Discord, Website URLs
   - Royalty Information: 7% royalty (implemented on-chain with ERC-2981)

2. **Connect to PaintSwap**:
   - Go to [PaintSwap.finance](https://paintswap.finance/)
   - Connect your wallet (must be the collection owner wallet)
   - Select "Collections" from the menu
   - Click "Submit Collection"

3. **Fill Submission Form**:
   - Contract Address: Your deployed NFT contract address
   - Select "ERC-721" as the contract type
   - Enter collection name, description, and other details
   - Upload banner image and logo
   - Provide social links
   - Confirm royalty information (should be detected automatically from ERC-2981)

4. **Confirm and Submit**:
   - Review all information for accuracy
   - Submit for verification
   - Wait for the PaintSwap team to review (typically 1-3 days)

## After Submission

While waiting for verification:

1. **Test Collection Display**:
   - Mint a few NFTs for testing
   - Check that metadata is displaying correctly
   - Verify all traits are shown correctly in the filters

2. **Prepare for Reveal** (if using a reveal strategy):
   - Finalize all artwork and metadata
   - When ready, call `setRevealed(true)` on the contract

3. **Marketing Preparation**:
   - Announce your PaintSwap listing on social media
   - Prepare promotional materials for reveal
   - Consider early access for community members

## Common Issues and Solutions

- **Missing Metadata**: Ensure your base URI ends with a trailing slash
- **Incorrect Images**: Double-check IPFS CIDs in metadata
- **Trait Filtering Issues**: Make sure your attribute format is correct
- **Royalty Not Detected**: Verify your ERC-2981 implementation

## PaintSwap Collection Page Features

Once verified, your collection will have:

- Trait filters for discovering NFTs by attribute
- Floor price tracking
- Volume statistics
- Offer system for making offers on NFTs
- Collection history
- Rarity rankings

For more detailed information, see our complete [METADATA_GUIDE.md](./METADATA_GUIDE.md) file. 