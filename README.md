# PandoraBoxAuthenticator

A decentralized application (dApp) for registering and verifying product authenticity on the Ethereum blockchain.

## Overview
PandoraBoxAuthenticator allows users to:
- **Register Products:** Store product details (name, ID, timestamp) on-chain.
- **Verify Authenticity:** Check if a product is genuine by querying its unique ID.
- Built with **Solidity** for the smart contract and **React** for the front-end.

## Features
- Secure product registration by any user (owner set as deployer).
- Verification returns product name, registrant address, and registration timestamp.
- Simple UI for interaction via Hardhat’s local wallet.

## Installation
1. Clone the repo:
   ```bash
   git clone https://github.com/your-username/PANDORABOX.git
   cd PANDORABOX

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```
