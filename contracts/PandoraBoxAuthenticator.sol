// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PandoraBoxAuthenticator {
    address public owner;

    struct Product {
        string name;
        address registeredBy;
        uint256 timestamp;
        bool exists;
        uint256 blockNumber; // Included in struct
    }

    mapping(bytes32 => Product) public products;

    event ProductRegistered(
        bytes32 indexed productId,
        string name,
        address indexed registeredBy,
        uint256 timestamp,
        uint256 blockNumber // Added to event
    );

    constructor() {
        owner = msg.sender;
    }

    function registerProduct(string memory _name, bytes32 _productId) public {
        require(!products[_productId].exists, "Product already registered");
        products[_productId] = Product({
            name: _name,
            registeredBy: msg.sender,
            timestamp: block.timestamp,
            exists: true,
            blockNumber: block.number // Store block number
        });
        emit ProductRegistered(_productId, _name, msg.sender, block.timestamp, block.number);
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