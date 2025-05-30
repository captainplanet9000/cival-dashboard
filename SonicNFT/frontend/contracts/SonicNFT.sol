// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title SonicNFT
 * @dev ERC721 token for the Sonic NFT Collection
 * Uses SONIC tokens for payment and implements ERC2981 for royalties
 */
contract SonicNFT is ERC721, ERC721Enumerable, ERC2981, Ownable {
    using Counters for Counters.Counter;
    using Strings for uint256;
    
    // Token counter
    Counters.Counter private _tokenIdCounter;
    
    // Collection parameters
    uint256 public maxSupply;
    uint256 public mintPrice;
    uint256 public maxPerWallet = 5;
    
    // SONIC token interface for payments
    IERC20 public sonicToken;
    
    // Base URI for metadata
    string private _baseTokenURI;
    
    // Suffix for metadata files (e.g., ".json")
    string private _uriSuffix = ".json";
    
    // Toggle for revealed state
    bool public revealed = false;
    
    // Not revealed URI
    string private _notRevealedURI;
    
    // Mapping to track mints per wallet
    mapping(address => uint256) public mintedByAddress;
    
    // Events
    event Minted(address indexed to, uint256 quantity, uint256 totalPrice);
    event BaseURIChanged(string newBaseURI);
    event NotRevealedURIChanged(string newNotRevealedURI);
    event Revealed(bool revealed);
    event SonicTokenAddressChanged(address newTokenAddress);
    event MaxPerWalletChanged(uint256 newMaxPerWallet);
    event RoyaltyInfoChanged(address receiver, uint96 feeNumerator);
    
    /**
     * @dev Constructor
     * @param _name Name of the NFT collection
     * @param _symbol Symbol of the NFT collection
     * @param _maxSupply Maximum supply of tokens
     * @param _mintPrice Price per token in SONIC
     * @param _sonicTokenAddress Address of the SONIC token contract
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _maxSupply,
        uint256 _mintPrice,
        address _sonicTokenAddress
    ) ERC721(_name, _symbol) {
        maxSupply = _maxSupply;
        mintPrice = _mintPrice;
        sonicToken = IERC20(_sonicTokenAddress);
        
        // Set default royalty of 7%
        _setDefaultRoyalty(owner(), 700); // 700 = 7%
    }
    
    /**
     * @dev Mint new tokens
     * @param _quantity Quantity of tokens to mint
     */
    function mint(uint256 _quantity) external payable {
        // Check if quantity is valid
        require(_quantity > 0, "Quantity must be greater than 0");
        
        // Check if mint would exceed max supply
        require(totalSupply() + _quantity <= maxSupply, "Would exceed max supply");
        
        // Check if mint would exceed max per wallet
        require(mintedByAddress[msg.sender] + _quantity <= maxPerWallet, "Would exceed max per wallet");
        
        // Calculate total price
        uint256 totalPrice = mintPrice * _quantity;
        
        // Transfer SONIC tokens from user to contract
        require(sonicToken.transferFrom(msg.sender, address(this), totalPrice), "SONIC token transfer failed");
        
        // Mint NFTs
        for (uint256 i = 0; i < _quantity; i++) {
            uint256 tokenId = _tokenIdCounter.current();
            _tokenIdCounter.increment();
            _safeMint(msg.sender, tokenId);
        }
        
        // Update minted count for sender
        mintedByAddress[msg.sender] += _quantity;
        
        // Emit event
        emit Minted(msg.sender, _quantity, totalPrice);
    }
    
    /**
     * @dev Get token URI for a specific token ID
     * @param _tokenId The ID of the token
     * @return tokenURI The URI for the token metadata
     */
    function tokenURI(uint256 _tokenId) public view virtual override returns (string memory) {
        require(_exists(_tokenId), "URI query for nonexistent token");
        
        if (!revealed) {
            return _notRevealedURI;
        }
        
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 
            ? string(abi.encodePacked(baseURI, _tokenId.toString(), _uriSuffix))
            : "";
    }
    
    /**
     * @dev Reveal the collection
     * @param _revealed True to reveal, false to hide
     */
    function setRevealed(bool _revealed) external onlyOwner {
        revealed = _revealed;
        emit Revealed(_revealed);
    }
    
    /**
     * @dev Set base URI for token metadata
     * @param _newBaseURI New base URI
     */
    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        _baseTokenURI = _newBaseURI;
        emit BaseURIChanged(_newBaseURI);
    }
    
    /**
     * @dev Set the not revealed URI
     * @param _newNotRevealedURI New not revealed URI
     */
    function setNotRevealedURI(string memory _newNotRevealedURI) external onlyOwner {
        _notRevealedURI = _newNotRevealedURI;
        emit NotRevealedURIChanged(_newNotRevealedURI);
    }
    
    /**
     * @dev Set URI suffix (e.g., ".json")
     * @param _newUriSuffix New URI suffix
     */
    function setUriSuffix(string memory _newUriSuffix) external onlyOwner {
        _uriSuffix = _newUriSuffix;
    }
    
    /**
     * @dev Set SONIC token address
     * @param _sonicTokenAddress New SONIC token address
     */
    function setSonicTokenAddress(address _sonicTokenAddress) external onlyOwner {
        sonicToken = IERC20(_sonicTokenAddress);
        emit SonicTokenAddressChanged(_sonicTokenAddress);
    }
    
    /**
     * @dev Set max tokens per wallet
     * @param _maxPerWallet New max per wallet
     */
    function setMaxPerWallet(uint256 _maxPerWallet) external onlyOwner {
        maxPerWallet = _maxPerWallet;
        emit MaxPerWalletChanged(_maxPerWallet);
    }
    
    /**
     * @dev Update royalty information
     * @param receiver Address to receive royalties
     * @param feeNumerator Fee numerator (e.g., 700 = 7%)
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
        emit RoyaltyInfoChanged(receiver, feeNumerator);
    }
    
    /**
     * @dev Reset default royalty information
     */
    function deleteDefaultRoyalty() external onlyOwner {
        _deleteDefaultRoyalty();
        emit RoyaltyInfoChanged(address(0), 0);
    }
    
    /**
     * @dev Withdraw SONIC tokens from contract
     */
    function withdraw() external onlyOwner {
        uint256 balance = sonicToken.balanceOf(address(this));
        require(balance > 0, "No SONIC tokens to withdraw");
        sonicToken.transfer(owner(), balance);
    }
    
    /**
     * @dev Base URI for computing {tokenURI}
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    // The following functions are overrides required by Solidity
    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
} 