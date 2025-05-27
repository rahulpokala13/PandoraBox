const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const deployedAddressFile = "./pandora-box-ui/src/contractAddress.js";
  let deployedAddress;

  // Check if the contract is already deployed
  if (fs.existsSync(deployedAddressFile)) {
    const data = fs.readFileSync(deployedAddressFile, "utf8");
    const match = data.match(/export const contractAddress = "(0x[0-9a-fA-F]{40})";/);
    if (match) {
      deployedAddress = match[1];
      console.log("Contract already deployed at:", deployedAddress);

      // Verify the contract exists at this address
      const code = await hre.ethers.provider.getCode(deployedAddress);
      if (code === "0x") {
        console.log("Contract no longer exists at this address. Redeploying...");
      } else {
        console.log("Contract verified. Deployment not needed.");
        return;
      }
    }
  }

  // Deploy the contract if not already deployed
  const PandoraBoxAuthenticator = await hre.ethers.getContractFactory("PandoraBoxAuthenticator");
  console.log("Deploying PandoraBoxAuthenticator...");
  const contract = await PandoraBoxAuthenticator.deploy();
  await contract.waitForDeployment();
  deployedAddress = await contract.getAddress();
  console.log("PandoraBoxAuthenticator deployed to:", deployedAddress);

  // Save the address to a file as a JavaScript module
  fs.writeFileSync(deployedAddressFile, `export const contractAddress = "${deployedAddress}";\n`);
}

main()
  .then(() => {
    console.log("Deployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });