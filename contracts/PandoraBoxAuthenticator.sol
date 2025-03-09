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

    mapping(bytes32 => Product) public products;

    event ProductRegistered(
        bytes32 indexed productId,
        string name,
        address indexed registeredBy,
        uint256 timestamp,
        uint256 blockNumber
    );

    constructor() {
        owner = msg.sender;
    }

    function registerProduct(string memory _name, bytes32 _productId, uint256 _timestamp) public {
        require(!products[_productId].exists, "Product already registered");
        uint256 timestampToUse = _timestamp == 0 ? block.timestamp : _timestamp; // Use provided timestamp or default to current
        products[_productId] = Product({
            name: _name,
            registeredBy: msg.sender,
            timestamp: timestampToUse,
            exists: true,
            blockNumber: block.number
        });
        emit ProductRegistered(_productId, _name, msg.sender, timestampToUse, block.number);
    }

    // Overload for backward compatibility (no timestamp)
    function registerProduct(string memory _name, bytes32 _productId) public {
        registerProduct(_name, _productId, 0); // Default to block.timestamp
    }

    function verifyProduct(bytes32 _productId) public view returns (bool, string memory, address, uint256, uint256) {
        if (products[_productId].exists) {
            Product memory p = products[_productId];
            return (true, p.name, p.registeredBy, p.timestamp, p.blockNumber);
        } else {
            return (false, "Product not found", address(0), 0, 0);
        }
    }
}