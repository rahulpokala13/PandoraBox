// scripts/dashboard.js
const { ethers } = require("ethers");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askQuestion(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  // Use Hardhat's default account #0 private key
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const wallet = new ethers.Wallet(privateKey, provider);
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Replace with your deployed address
  const abi = require("../artifacts/contracts/PandoraBoxAuthenticator.sol/PandoraBoxAuthenticator.json").abi;
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  console.log("Dashboard running at:", contractAddress);

  while (true) {
    console.log("\nOptions: register, verify, exit");
    const action = await askQuestion("What would you like to do? ");

    if (action.toLowerCase() === "exit") {
      console.log("Exiting dashboard...");
      break;
    }

    if (action.toLowerCase() === "register") {
      const name = await askQuestion("Enter product name: ");
      const id = await askQuestion("Enter product ID: ");
      const productId = "0x" + Buffer.from(id, "utf8").toString("hex").padEnd(64, "0");
      await contract.registerProduct(name, productId);
      console.log(`Registered ${name} with ID ${id}`);
    } else if (action.toLowerCase() === "verify") {
      const id = await askQuestion("Enter product ID to verify: ");
      const productId = "0x" + Buffer.from(id, "utf8").toString("hex").padEnd(64, "0");
      const [exists, name, by, time] = await contract.verifyProduct(productId);
      console.log("Verification result:", { exists, name, by, time });
    } else {
      console.log("Invalid option. Try 'register', 'verify', or 'exit'.");
    }
  }

  rl.close();
}

main().catch((error) => {
  console.error(error);
  rl.close();
  process.exit(1);
});