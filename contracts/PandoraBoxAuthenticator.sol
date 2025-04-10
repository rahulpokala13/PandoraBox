// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PandoraBoxAuthenticator {
    address public owner;

    struct Product {
        string name;
        address registeredBy;
        uint256 timestamp;
        bool exists;
        uint256 blockNumber;
    }

    struct Verification {
        address verifier;
        uint256 timestamp;
    }

    mapping(bytes32 => Product) public products;
    mapping(bytes32 => Verification[]) public verifications;

    event ProductRegistered(
        bytes32 indexed productId,
        string name,
        address indexed registeredBy,
        uint256 timestamp,
        uint256 blockNumber
    );
    event ProductVerified(
        bytes32 indexed productId,
        address indexed verifier,
        uint256 timestamp
    );

    constructor() {
        owner = msg.sender;
    }

    function registerProduct(string memory _name, bytes32 _productId, uint256 _timestamp) public {
        require(!products[_productId].exists, "Product already registered");
        uint256 timestampToUse = _timestamp == 0 ? block.timestamp : _timestamp;
        products[_productId] = Product({
            name: _name,
            registeredBy: msg.sender,
            timestamp: timestampToUse,
            exists: true,
            blockNumber: block.number
        });
        emit ProductRegistered(_productId, _name, msg.sender, timestampToUse, block.number);
    }

    function registerProduct(string memory _name, bytes32 _productId) public {
        registerProduct(_name, _productId, 0);
    }

    function verifyProduct(bytes32 _productId) public returns (bool, string memory, address, uint256, uint256) {
        require(products[_productId].exists, "Product does not exist");
        Product memory p = products[_productId];
        verifications[_productId].push(Verification({
            verifier: msg.sender,
            timestamp: block.timestamp
        }));
        emit ProductVerified(_productId, msg.sender, block.timestamp);
        return (true, p.name, p.registeredBy, p.timestamp, p.blockNumber);
    }

    function getVerifications(bytes32 _productId) public view returns (Verification[] memory) {
        require(products[_productId].exists, "Product does not exist");
        return verifications[_productId];
    }

    function getProduct(bytes32 _productId) public view returns (
        bool exists,
        string memory name,
        address registeredBy,
        uint256 timestamp,
        uint256 blockNumber
    ) {
        Product memory p = products[_productId];
        return (p.exists, p.name, p.registeredBy, p.timestamp, p.blockNumber);
    }
}
