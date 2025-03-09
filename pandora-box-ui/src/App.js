// src/App.js
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Update after deployment
const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Hardhat #0 (0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
const abi = [
  {
    "inputs": [
      {"internalType": "string", "name": "_name", "type": "string"},
      {"internalType": "bytes32", "name": "_productId", "type": "bytes32"}
    ],
    "name": "registerProduct",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes32", "name": "_productId", "type": "bytes32"}
    ],
    "name": "verifyProduct",
    "outputs": [
      {"internalType": "bool", "name": "", "type": "bool"},
      {"internalType": "string", "name": "", "type": "string"},
      {"internalType": "address", "name": "", "type": "address"},
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

function App() {
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [verifyId, setVerifyId] = useState("");
  const [resultRegister, setResultRegister] = useState(null);
  const [resultVerify, setResultVerify] = useState(null);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const wallet = new ethers.Wallet(privateKey, provider);
        const contractInstance = new ethers.Contract(contractAddress, abi, wallet);

        setContract(contractInstance);
        setAccount(wallet.address);
      } catch (error) {
        console.error("Initialization failed:", error);
        setResultRegister({ error: "Failed to connect to contract" });
      }
    };
    init();
  }, []);

  const registerProduct = async () => {
    if (!contract) return;
    setLoadingRegister(true);
    try {
      const bytes32Id = ethers.encodeBytes32String(productId);
      const tx = await contract.registerProduct(name, bytes32Id);
      await tx.wait();
      setResultRegister({ message: `Registered ${name} with ID ${productId}` });
      setName("");
      setProductId("");
    } catch (error) {
      setResultRegister({ error: error.message });
    } finally {
      setLoadingRegister(false);
    }
  };

  const verifyProduct = async () => {
    if (!contract) return;
    setLoadingVerify(true);
    try {
      const bytes32Id = ethers.encodeBytes32String(verifyId);
      const [exists, prodName, registeredBy, timestamp] = await contract.verifyProduct(bytes32Id);
      if (exists) {
        const date = new Date(Number(timestamp) * 1000);
        const formattedTime = date.toLocaleString();
        setResultVerify({ exists, name: prodName, registeredBy, timestamp: formattedTime });
      } else {
        setResultVerify({ message: "Product not found" });
      }
      setVerifyId("");
    } catch (error) {
      setResultVerify({ error: error.message });
    } finally {
      setLoadingVerify(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px",
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        color: "#333"
      }}
    >
      <h1 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "40px" }}>
        Pandora Box
      </h1>
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        Connected: {account || "Not connected"}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          maxWidth: "900px",
          width: "100%",
          justifyContent: "center"
        }}
      >
        {/* Register Card */}
        <div
          style={{
            flex: "1",
            minWidth: "300px",
            background: "#fff",
            padding: "30px",
            borderRadius: "10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
          }}
        >
          <h2 style={{ fontSize: "1.5rem", marginBottom: "20px", fontWeight: 500 }}>
            Register Product
          </h2>
          <input
            type="text"
            placeholder="Product Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "15px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              fontSize: "1rem",
              outline: "none",
              boxSizing: "border-box"
            }}
          />
          <input
            type="text"
            placeholder="Product ID"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "15px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              fontSize: "1rem",
              outline: "none",
              boxSizing: "border-box"
            }}
          />
          <button
            onClick={registerProduct}
            disabled={loadingRegister || !contract}
            style={{
              width: "100%",
              padding: "12px",
              background: loadingRegister || !contract ? "#999" : "#333",
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "1rem",
              cursor: loadingRegister || !contract ? "not-allowed" : "pointer",
              transition: "background 0.3s"
            }}
          >
            {loadingRegister ? "Processing..." : "Register"}
          </button>
          {resultRegister && (
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                borderRadius: "6px",
                border: "1px solid",
                borderColor: resultRegister.error ? "#d9534f" : "#5cb85c",
                background: resultRegister.error ? "#f2dede" : "#dff0d8",
                fontSize: "0.9rem"
              }}
            >
              <strong>{resultRegister.error ? "Error" : "Result"}</strong>
              <pre style={{ margin: "10px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {JSON.stringify(resultRegister, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Verify Card */}
        <div
          style={{
            flex: "1",
            minWidth: "300px",
            background: "#fff",
            padding: "30px",
            borderRadius: "10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
          }}
        >
          <h2 style={{ fontSize: "1.5rem", marginBottom: "20px", fontWeight: 500 }}>
            Verify Product
          </h2>
          <input
            type="text"
            placeholder="Product ID"
            value={verifyId}
            onChange={(e) => setVerifyId(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "15px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              fontSize: "1rem",
              outline: "none",
              boxSizing: "border-box"
            }}
          />
          <button
            onClick={verifyProduct}
            disabled={loadingVerify || !contract}
            style={{
              width: "100%",
              padding: "12px",
              background: loadingVerify || !contract ? "#999" : "#333",
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "1rem",
              cursor: loadingVerify || !contract ? "not-allowed" : "pointer",
              transition: "background 0.3s"
            }}
          >
            {loadingVerify ? "Processing..." : "Verify"}
          </button>
          {resultVerify && (
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                borderRadius: "6px",
                border: "1px solid",
                borderColor: resultVerify.error ? "#d9534f" : "#5cb85c",
                background: resultVerify.error ? "#f2dede" : "#dff0d8",
                fontSize: "0.9rem"
              }}
            >
              <strong>{resultVerify.error ? "Error" : "Result"}</strong>
              <pre style={{ margin: "10px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {JSON.stringify(resultVerify, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;