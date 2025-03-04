const { expect } = require("chai");

describe("PandoraBoxAuthenticator", function () {
  let contract, owner;
  
  beforeEach(async function () {
    const ContractFactory = await ethers.getContractFactory("PandoraBoxAuthenticator");
    [owner] = await ethers.getSigners();
    contract = await ContractFactory.deploy();
    await contract.waitForDeployment();
  });
  
  it("should register and verify a product", async function () {
    const input = "productTest";
    const productId = "0x" + Buffer.from(input, "utf8").toString("hex").padEnd(64, "0");
    
    // Register product
    await contract.registerProduct("Test Product", productId);
    
    // Verify product
    const [exists, name, registeredBy, timestamp] = await contract.verifyProduct(productId);
    
    expect(exists).to.be.true;
    expect(name).to.equal("Test Product");
    expect(registeredBy).to.equal(owner.address);
    expect(timestamp).to.be.a("bigint"); // Fix here
  });
});