const hre = require("hardhat");

async function main() {
  const PandoraBoxAuthenticator = await hre.ethers.getContractFactory("PandoraBoxAuthenticator");
  console.log("Deploying PandoraBoxAuthenticator...");

  const contract = await PandoraBoxAuthenticator.deploy();
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("PandoraBoxAuthenticator deployed to:", contractAddress);

  // // Register a test product
  // console.log("Registering test product 'Red Apple'...");
  // const tx = await contract.registerProduct("Red Apple", hre.ethers.encodeBytes32String("redApple"));
  // await tx.wait();
  // console.log("Registered 'Red Apple' with ID 'redApple'");
}

main()
  .then(() => {
    console.log("Deployment and registration successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });