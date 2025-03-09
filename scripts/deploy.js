// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  const PandoraBoxAuthenticator = await hre.ethers.getContractFactory("PandoraBoxAuthenticator");
  console.log("Deploying PandoraBoxAuthenticator...");

  const contract = await PandoraBoxAuthenticator.deploy();
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("PandoraBoxAuthenticator deployed to:", contractAddress);
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