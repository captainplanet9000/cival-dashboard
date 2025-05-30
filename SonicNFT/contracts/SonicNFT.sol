// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract SonicNFT is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    using Strings for uint256;

    Counters.Counter private _tokenIdCounter;
    
    // Collection parameters
    uint256 public constant MAX_SUPPLY = 5000;
    uint256 public maxPerWallet = 5;
    bool public mintingActive = false;
    bool public revealed = false;
    
    // Metadata URIs
    string private _baseURIExtended;
    string public notRevealedUri;
    
    // Minting tracking
    mapping(address => uint256) public mintedPerWallet;
    
    // Events
    event Minted(address indexed to, uint256 indexed tokenId);
    event Revealed(bool revealState);
    
    constructor(
        string memory name,
        string memory symbol,
        string memory initialBaseURI,
        string memory initialNotRevealedUri
    ) ERC721(name, symbol) {
        _baseURIExtended = initialBaseURI;
        notRevealedUri = initialNotRevealedUri;
    }
    
    // Public free mint function
    function mint(uint256 quantity) external nonReentrant {
        require(mintingActive, "Minting is not active");
        require(quantity > 0, "Must mint at least one NFT");
        require(totalSupply() + quantity <= MAX_SUPPLY, "Exceeds maximum supply");
        require(mintedPerWallet[msg.sender] + quantity <= maxPerWallet, "Exceeds max per wallet");
        
        mintedPerWallet[msg.sender] += quantity;
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _tokenIdCounter.current();
            _tokenIdCounter.increment();
            _safeMint(msg.sender, tokenId);
            emit Minted(msg.sender, tokenId);
        }
    }
    
    // Reveal function (owner only)
    function revealCollection() external onlyOwner {
        revealed = true;
        emit Revealed(true);
    }
    
    // Metadata functions
    function _baseURI() internal view override returns (string memory) {
        return _baseURIExtended;
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        
        if (!revealed) {
            return notRevealedUri;
        }
        
        return string(abi.encodePacked(_baseURI(), tokenId.toString(), ".json"));
    }
    
    // Admin functions
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseURIExtended = newBaseURI;
    }
    
    function setNotRevealedURI(string memory newNotRevealedURI) external onlyOwner {
        notRevealedUri = newNotRevealedURI;
    }
    
    function setMintingActive(bool _state) external onlyOwner {
        mintingActive = _state;
    }
    
    function setMaxPerWallet(uint256 _maxPerWallet) external onlyOwner {
        maxPerWallet = _maxPerWallet;
    }
    
    // Owner can withdraw funds if needed for future functionality
    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }
    
    // Required overrides
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
} 