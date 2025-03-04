// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PandoraBoxAuthenticator {
    // Contract owner (optional, can be used for administrative tasks)
    address public owner;

    // Define a Product structure
    struct Product {
        string name;         // Product name or description
        address registeredBy; // Address that registered the product
        uint256 timestamp;   // When the product was registered
        bool exists;         // Flag to check existence
    }

    // Mapping from a unique product identifier (bytes32) to its Product details
    mapping(bytes32 => Product) public products;

    // Event emitted when a product is successfully registered
    event ProductRegistered(
        bytes32 indexed productId,
        string name,
        address indexed registeredBy,
        uint256 timestamp
    );

    // Constructor sets the deployer as the contract owner
    constructor() {
        owner = msg.sender;
    }

    // Modifier to restrict access to only the owner (if needed in the future)
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    /**
     * @dev Register a new product.
     * @param _name The name/description of the product.
     * @param _productId A unique identifier for the product (preferably generated off-chain).
     */
    function registerProduct(string memory _name, bytes32 _productId) public {
        // Ensure that the product isn't already registered
        require(!products[_productId].exists, "Product already registered");

        // Save the product details on the blockchain
        products[_productId] = Product({
            name: _name,
            registeredBy: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        // Emit an event for off-chain tracking and audits
        emit ProductRegistered(_productId, _name, msg.sender, block.timestamp);
    }

    /**
     * @dev Verify if a product is authentic.
     * @param _productId The unique identifier of the product.
     * @return A tuple containing:
     *         - bool: true if the product exists, false otherwise.
     *         - string: the product name (if exists).
     *         - address: the address that registered the product.
     *         - uint256: the timestamp of registration.
     */
    function verifyProduct(bytes32 _productId) public view returns (bool, string memory, address, uint256) {
        // Check if the product exists and return details if so
        if (products[_productId].exists) {
            Product memory p = products[_productId];
            return (true, p.name, p.registeredBy, p.timestamp);
        } else {
            return (false, "", address(0), 0);
        }
    }
}
