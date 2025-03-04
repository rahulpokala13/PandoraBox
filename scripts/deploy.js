const hre = require("hardhat");

async function main() {
  const PandoraBoxAuthenticator = await hre.ethers.getContractFactory("PandoraBoxAuthenticator");
  console.log("Deploying PandoraBoxAuthenticator...");
  const contract = await PandoraBoxAuthenticator.deploy();

  // Wait for the contract to be mined and fully deployed
  await contract.waitForDeployment();

  console.log("PandoraBoxAuthenticator deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});