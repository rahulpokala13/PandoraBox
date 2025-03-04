// src/App.js
import React, { useState } from "react"; // Import React and useState
import { ethers } from "ethers"; // Import ethers
import abi from "./abi.json"; // Import ABI

// Define constants outside the component
const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Update if different
const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Hardhat account #0

function App() {
  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [verifyId, setVerifyId] = useState("");
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  const registerProduct = async () => {
    setIsLoading(true);
    try {
      const bytes32Id = ethers.encodeBytes32String(productId);
      const tx = await contract.registerProduct(name, bytes32Id);
      await tx.wait();
      setResult({ message: `Registered ${name} with ID ${productId}` });
      setName("");
      setProductId("");
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyProduct = async () => {
    setIsLoading(true);
    try {
      const bytes32Id = ethers.encodeBytes32String(verifyId);
      const [exists, name, registeredBy, timestamp] = await contract.verifyProduct(bytes32Id);
      const date = new Date(Number(timestamp) * 1000);
      const formattedTime = date.toLocaleString();
      setResult({ exists, name, registeredBy, timestamp: formattedTime });
      setVerifyId("");
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#333", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "400px", padding: "20px", border: "1px solid #e0e0e0", borderRadius: "8px", background: "#fff" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 500, textAlign: "center", marginBottom: "25px", color: "#000" }}>Pandora Box</h1>

        <div style={{ marginBottom: "25px" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 400, marginBottom: "10px" }}>Register</h2>
          <input type="text" placeholder="Product Name" value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: "8px", marginBottom: "10px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "1rem", outline: "none", boxSizing: "border-box" }} />
          <input type="text" placeholder="Product ID" value={productId} onChange={(e) => setProductId(e.target.value)} style={{ width: "100%", padding: "8px", marginBottom: "10px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "1rem", outline: "none", boxSizing: "border-box" }} />
          <button onClick={registerProduct} disabled={isLoading} style={{ width: "100%", padding: "10px", background: isLoading ? "#666" : "#000", border: "none", borderRadius: "4px", color: "#fff", fontSize: "1rem", fontWeight: 500, cursor: isLoading ? "not-allowed" : "pointer", transition: "background 0.2s" }}>
            {isLoading ? "Processing..." : "Register"}
          </button>
        </div>

        <div style={{ marginBottom: "25px" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 400, marginBottom: "10px" }}>Verify</h2>
          <input type="text" placeholder="Product ID" value={verifyId} onChange={(e) => setVerifyId(e.target.value)} style={{ width: "100%", padding: "8px", marginBottom: "10px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "1rem", outline: "none", boxSizing: "border-box" }} />
          <button onClick={verifyProduct} disabled={isLoading} style={{ width: "100%", padding: "10px", background: isLoading ? "#666" : "#000", border: "none", borderRadius: "4px", color: "#fff", fontSize: "1rem", fontWeight: 500, cursor: isLoading ? "not-allowed" : "pointer", transition: "background 0.2s" }}>
            {isLoading ? "Processing..." : "Verify"}
          </button>
        </div>

        {result && (
          <div style={{ marginTop: "20px", padding: "15px", border: "1px solid", borderColor: result.error ? "#ff4444" : "#44cc44", borderRadius: "4px", background: result.error ? "#ffe6e6" : "#e6ffe6", maxHeight: "200px", overflowY: "auto", fontSize: "0.9rem", color: "#333" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 400, marginBottom: "10px" }}>{result.error ? "Error" : "Result"}</h3>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default App; // Explicit default export