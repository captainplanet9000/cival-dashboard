// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title Recursives
 * @dev A generative art NFT collection on the Sonic blockchain
 */
contract Recursives is ERC721Enumerable, Ownable, ReentrancyGuard {
    using Strings for uint256;

    // Collection constants
    uint256 public constant MAX_SUPPLY = 5000;
    uint256 public constant MAX_PER_WALLET = 10;
    uint256 public constant MAX_PER_TX = 5;
    
    // Pricing
    uint256 public mintPrice = 0.08 ether;
    uint256 public whitelistPrice = 0.05 ether;
    
    // Sale status
    bool public saleIsActive = false;
    bool public whitelistSaleIsActive = false;
    
    // Whitelist
    bytes32 public merkleRoot;
    
    // Metadata
    string private _baseTokenURI;
    bool public revealed = false;
    string public notRevealedUri;
    
    // Royalties - 5% (500 basis points)
    uint96 public royaltyFeeBasisPoints = 500;
    address public royaltyRecipient;
    
    // Reserved tokens for team/giveaways
    uint256 public reservedTokens = 100;
    uint256 public reservedTokensClaimed = 0;
    
    // Minting tracking
    mapping(address => uint256) public numberMinted;
    
    // Events
    event Minted(address indexed minter, uint256 amount, uint256 startingTokenId);
    event SaleStatusChanged(bool isActive);
    event WhitelistSaleStatusChanged(bool isActive);
    event BaseURIChanged(string newBaseURI);
    event Revealed();
    event PriceChanged(uint256 newPrice);
    
    /**
     * @dev Constructor sets up the token details
     * @param _name Name of the collection
     * @param _symbol Symbol of the collection
     * @param _initBaseURI Initial base URI for metadata
     * @param _notRevealedUri URI for pre-reveal placeholder
     */
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _initBaseURI,
        string memory _notRevealedUri
    ) ERC721(_name, _symbol) {
        setBaseURI(_initBaseURI);
        setNotRevealedURI(_notRevealedUri);
        royaltyRecipient = owner();
    }
    
    /**
     * @dev Standard whitelist mint function
     * @param _mintAmount The number of tokens to mint
     * @param _merkleProof Merkle proof to verify whitelist
     */
    function whitelistMint(uint256 _mintAmount, bytes32[] calldata _merkleProof) 
        public 
        payable 
        nonReentrant 
    {
        require(whitelistSaleIsActive, "Whitelist sale is not active");
        require(_mintAmount > 0 && _mintAmount <= MAX_PER_TX, "Invalid mint amount");
        
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(_merkleProof, merkleRoot, leaf), "Not whitelisted");
        
        uint256 supply = totalSupply();
        require(supply + _mintAmount <= MAX_SUPPLY, "Would exceed max supply");
        
        require(numberMinted[msg.sender] + _mintAmount <= MAX_PER_WALLET, "Would exceed max per wallet");
        require(msg.value >= whitelistPrice * _mintAmount, "Insufficient funds");
        
        numberMinted[msg.sender] += _mintAmount;
        
        for (uint256 i = 0; i < _mintAmount; i++) {
            _safeMint(msg.sender, supply + i);
        }
        
        emit Minted(msg.sender, _mintAmount, supply);
    }
    
    /**
     * @dev Standard public mint function
     * @param _mintAmount The number of tokens to mint
     */
    function mint(uint256 _mintAmount) 
        public 
        payable 
        nonReentrant 
    {
        require(saleIsActive, "Sale is not active");
        require(_mintAmount > 0 && _mintAmount <= MAX_PER_TX, "Invalid mint amount");
        
        uint256 supply = totalSupply();
        require(supply + _mintAmount <= MAX_SUPPLY, "Would exceed max supply");
        
        require(numberMinted[msg.sender] + _mintAmount <= MAX_PER_WALLET, "Would exceed max per wallet");
        require(msg.value >= mintPrice * _mintAmount, "Insufficient funds");
        
        numberMinted[msg.sender] += _mintAmount;
        
        for (uint256 i = 0; i < _mintAmount; i++) {
            _safeMint(msg.sender, supply + i);
        }
        
        emit Minted(msg.sender, _mintAmount, supply);
    }
    
    /**
     * @dev Mint tokens reserved for the team
     * @param _to Recipient of the tokens
     * @param _mintAmount Amount of tokens to mint
     */
    function teamMint(address _to, uint256 _mintAmount) 
        public 
        onlyOwner 
    {
        require(_mintAmount > 0, "Invalid mint amount");
        require(reservedTokensClaimed + _mintAmount <= reservedTokens, "Not enough reserved tokens left");
        
        uint256 supply = totalSupply();
        require(supply + _mintAmount <= MAX_SUPPLY, "Would exceed max supply");
        
        reservedTokensClaimed += _mintAmount;
        
        for (uint256 i = 0; i < _mintAmount; i++) {
            _safeMint(_to, supply + i);
        }
        
        emit Minted(_to, _mintAmount, supply);
    }
    
    /**
     * @dev Reveal the collection
     */
    function reveal() public onlyOwner {
        revealed = true;
        emit Revealed();
    }
    
    /**
     * @dev Set the base URI for all token metadata
     * @param _newBaseURI New base URI
     */
    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        _baseTokenURI = _newBaseURI;
        emit BaseURIChanged(_newBaseURI);
    }
    
    /**
     * @dev Set the not revealed URI
     * @param _notRevealedURI New not revealed URI
     */
    function setNotRevealedURI(string memory _notRevealedURI) public onlyOwner {
        notRevealedUri = _notRevealedURI;
    }
    
    /**
     * @dev Set the whitelist merkle root
     * @param _merkleRoot New merkle root
     */
    function setMerkleRoot(bytes32 _merkleRoot) public onlyOwner {
        merkleRoot = _merkleRoot;
    }
    
    /**
     * @dev Set the mint price
     * @param _mintPrice New mint price
     */
    function setMintPrice(uint256 _mintPrice) public onlyOwner {
        mintPrice = _mintPrice;
        emit PriceChanged(_mintPrice);
    }
    
    /**
     * @dev Set the whitelist price
     * @param _whitelistPrice New whitelist price
     */
    function setWhitelistPrice(uint256 _whitelistPrice) public onlyOwner {
        whitelistPrice = _whitelistPrice;
    }
    
    /**
     * @dev Toggle the public sale status
     * @param _saleIsActive New sale status
     */
    function setSaleStatus(bool _saleIsActive) public onlyOwner {
        saleIsActive = _saleIsActive;
        emit SaleStatusChanged(_saleIsActive);
    }
    
    /**
     * @dev Toggle the whitelist sale status
     * @param _whitelistSaleIsActive New whitelist sale status
     */
    function setWhitelistSaleStatus(bool _whitelistSaleIsActive) public onlyOwner {
        whitelistSaleIsActive = _whitelistSaleIsActive;
        emit WhitelistSaleStatusChanged(_whitelistSaleIsActive);
    }
    
    /**
     * @dev Set the royalty recipient
     * @param _royaltyRecipient New royalty recipient
     */
    function setRoyaltyRecipient(address _royaltyRecipient) public onlyOwner {
        royaltyRecipient = _royaltyRecipient;
    }
    
    /**
     * @dev Set royalty fee in basis points (100 = 1%)
     * @param _royaltyFeeBasisPoints New royalty fee
     */
    function setRoyaltyFeeBasisPoints(uint96 _royaltyFeeBasisPoints) public onlyOwner {
        require(_royaltyFeeBasisPoints <= 1000, "Too high"); // max 10%
        royaltyFeeBasisPoints = _royaltyFeeBasisPoints;
    }
    
    /**
     * @dev Implementation of {IERC721Metadata-tokenURI}
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "URI query for nonexistent token");
        
        if (!revealed) {
            return notRevealedUri;
        }
        
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId.toString(), ".json")) : "";
    }
    
    /**
     * @dev Base URI for computing {tokenURI}
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }
    
    /**
     * @dev Withdraw funds from the contract
     */
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        // Split: 95% to owner, 5% to development fund
        uint256 devShare = (balance * 5) / 100;
        uint256 ownerShare = balance - devShare;
        
        (bool devSuccess, ) = payable(0x1234567890123456789012345678901234567890).call{value: devShare}("");
        require(devSuccess, "Dev transfer failed");
        
        (bool ownerSuccess, ) = payable(owner()).call{value: ownerShare}("");
        require(ownerSuccess, "Owner transfer failed");
    }
    
    /**
     * @dev EIP-2981 royalty standard
     */
    function royaltyInfo(uint256 _tokenId, uint256 _salePrice) external view returns (address receiver, uint256 royaltyAmount) {
        require(_exists(_tokenId), "Nonexistent token");
        return (royaltyRecipient, (_salePrice * royaltyFeeBasisPoints) / 10000);
    }
    
    /**
     * @dev Check EIP-2981 support
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Enumerable) returns (bool) {
        return
            interfaceId == 0x2a55205a || // EIP-2981 Interface ID for ERC2981
            super.supportsInterface(interfaceId);
    }
} 