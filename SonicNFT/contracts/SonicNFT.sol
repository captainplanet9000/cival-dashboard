// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title SonicNFT
 * @dev Contract for minting generative art NFTs on the Sonic blockchain
 */
contract SonicNFT is ERC721Enumerable, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    using Strings for uint256;

    Counters.Counter private _tokenIds;
    
    // Collection details
    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public mintPrice = 0.05 ether;
    uint256 public maxMintsPerTx = 10;
    bool public mintingActive = false;
    bool public presaleActive = false;
    
    // Base URI for metadata
    string private _baseTokenURI;
    
    // Royalty info
    uint256 public constant ROYALTY_FEE = 750; // 7.5%
    address public royaltyRecipient;
    
    // Generator types stored with each token
    mapping(uint256 => uint8) public tokenGeneratorType;
    
    // Presale whitelist
    mapping(address => uint256) public whitelist;
    
    // Events
    event NFTMinted(address indexed minter, uint256 indexed tokenId, uint8 generatorType);
    event BaseURIChanged(string newBaseURI);
    event MintPriceChanged(uint256 newPrice);
    event MintingActivationChanged(bool active);
    event PresaleActivationChanged(bool active);
    
    /**
     * @dev Constructor
     * @param name Collection name
     * @param symbol Collection symbol
     * @param baseURI Base metadata URI
     */
    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI
    ) ERC721(name, symbol) {
        _baseTokenURI = baseURI;
        royaltyRecipient = owner();
    }
    
    /**
     * @dev Override required by Solidity for multiple inheritance from the same base
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId, 
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
    
    /**
     * @dev Override required by Solidity for multiple inheritance from the same base
     */
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    /**
     * @dev Override required by Solidity for multiple inheritance from the same base
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    /**
     * @dev Override required by Solidity for multiple inheritance from the same base
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    /**
     * @dev Set base URI for metadata
     * @param baseURI New base URI
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
        emit BaseURIChanged(baseURI);
    }
    
    /**
     * @dev Base URI for computing tokenURI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    /**
     * @dev Set mint price
     * @param price New mint price
     */
    function setMintPrice(uint256 price) external onlyOwner {
        mintPrice = price;
        emit MintPriceChanged(price);
    }
    
    /**
     * @dev Set max mints per transaction
     * @param max New max mints per transaction
     */
    function setMaxMintsPerTx(uint256 max) external onlyOwner {
        maxMintsPerTx = max;
    }
    
    /**
     * @dev Toggle minting activation
     * @param active New minting active state
     */
    function setMintingActive(bool active) external onlyOwner {
        mintingActive = active;
        emit MintingActivationChanged(active);
    }
    
    /**
     * @dev Toggle presale activation
     * @param active New presale active state
     */
    function setPresaleActive(bool active) external onlyOwner {
        presaleActive = active;
        emit PresaleActivationChanged(active);
    }
    
    /**
     * @dev Add addresses to presale whitelist
     * @param addresses Array of addresses to whitelist
     * @param numAllowed Number of mints allowed per address
     */
    function addToWhitelist(address[] calldata addresses, uint256 numAllowed) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            whitelist[addresses[i]] = numAllowed;
        }
    }
    
    /**
     * @dev Set royalty recipient
     * @param recipient New royalty recipient
     */
    function setRoyaltyRecipient(address recipient) external onlyOwner {
        require(recipient != address(0), "Zero address not allowed");
        royaltyRecipient = recipient;
    }
    
    /**
     * @dev Get royalty info for marketplaces that support EIP-2981
     * @param _tokenId Token ID
     * @param _salePrice Sale price of the token
     * @return receiver Royalty receiver
     * @return royaltyAmount Royalty amount
     */
    function royaltyInfo(uint256 _tokenId, uint256 _salePrice) external view returns (address receiver, uint256 royaltyAmount) {
        return (royaltyRecipient, (_salePrice * ROYALTY_FEE) / 10000);
    }
    
    /**
     * @dev Mint NFTs during presale
     * @param quantity Number of NFTs to mint
     * @param generatorTypes Array of generator types for each NFT
     */
    function presaleMint(uint256 quantity, uint8[] calldata generatorTypes) external payable nonReentrant {
        require(presaleActive, "Presale not active");
        require(quantity > 0, "Must mint at least one");
        require(quantity <= maxMintsPerTx, "Exceeds max per transaction");
        require(whitelist[msg.sender] >= quantity, "Not whitelisted or exceeded allowed mints");
        require(totalSupply() + quantity <= MAX_SUPPLY, "Would exceed max supply");
        require(msg.value >= mintPrice * quantity, "Insufficient payment");
        require(generatorTypes.length == quantity, "Mismatch between quantity and generator types");
        
        whitelist[msg.sender] -= quantity;
        
        for (uint256 i = 0; i < quantity; i++) {
            require(generatorTypes[i] < 5, "Invalid generator type");
            _mintNFT(msg.sender, generatorTypes[i]);
        }
    }
    
    /**
     * @dev Mint NFTs during public sale
     * @param quantity Number of NFTs to mint
     * @param generatorTypes Array of generator types for each NFT
     */
    function mint(uint256 quantity, uint8[] calldata generatorTypes) external payable nonReentrant {
        require(mintingActive, "Minting not active");
        require(quantity > 0, "Must mint at least one");
        require(quantity <= maxMintsPerTx, "Exceeds max per transaction");
        require(totalSupply() + quantity <= MAX_SUPPLY, "Would exceed max supply");
        require(msg.value >= mintPrice * quantity, "Insufficient payment");
        require(generatorTypes.length == quantity, "Mismatch between quantity and generator types");
        
        for (uint256 i = 0; i < quantity; i++) {
            require(generatorTypes[i] < 5, "Invalid generator type");
            _mintNFT(msg.sender, generatorTypes[i]);
        }
    }
    
    /**
     * @dev Reserved minting for owner (e.g., giveaways, team allocation)
     * @param to Recipient address
     * @param quantity Number of NFTs to mint
     * @param generatorTypes Array of generator types for each NFT
     */
    function ownerMint(address to, uint256 quantity, uint8[] calldata generatorTypes) external onlyOwner {
        require(quantity > 0, "Must mint at least one");
        require(totalSupply() + quantity <= MAX_SUPPLY, "Would exceed max supply");
        require(generatorTypes.length == quantity, "Mismatch between quantity and generator types");
        
        for (uint256 i = 0; i < quantity; i++) {
            require(generatorTypes[i] < 5, "Invalid generator type");
            _mintNFT(to, generatorTypes[i]);
        }
    }
    
    /**
     * @dev Internal function to mint an NFT
     * @param to Recipient address
     * @param generatorType Type of generator used (0-4)
     * @return tokenId The newly minted token ID
     */
    function _mintNFT(address to, uint8 generatorType) internal returns (uint256) {
        _tokenIds.increment();
        uint256 tokenId = _tokenIds.current();
        
        _safeMint(to, tokenId);
        
        // Store generator type
        tokenGeneratorType[tokenId] = generatorType;
        
        // Set token URI
        _setTokenURI(tokenId, tokenId.toString());
        
        emit NFTMinted(to, tokenId, generatorType);
        
        return tokenId;
    }
    
    /**
     * @dev Withdraw contract funds
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
} 