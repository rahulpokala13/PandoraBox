// src/components/Register.js
import React, { useState } from "react";
import { ethers } from "ethers";

const Register = ({ contract }) => {
  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <div style={{ width: "100%", maxWidth: "400px", padding: "20px", border: "1px solid #e0e0e0", borderRadius: "8px", background: "#fff" }}>
      <h2 style={{ fontSize: "1.8rem", fontWeight: 500, textAlign: "center", marginBottom: "25px", color: "#000" }}>Register Product</h2>
      <input type="text" placeholder="Product Name" value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: "8px", marginBottom: "10px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "1rem", outline: "none", boxSizing: "border-box" }} />
      <input type="text" placeholder="Product ID" value={productId} onChange={(e) => setProductId(e.target.value)} style={{ width: "100%", padding: "8px", marginBottom: "10px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "1rem", outline: "none", boxSizing: "border-box" }} />
      <button onClick={registerProduct} disabled={isLoading} style={{ width: "100%", padding: "10px", background: isLoading ? "#666" : "#000", border: "none", borderRadius: "4px", color: "#fff", fontSize: "1rem", fontWeight: 500, cursor: isLoading ? "not-allowed" : "pointer", transition: "background 0.2s" }}>
        {isLoading ? "Processing..." : "Register"}
      </button>
      {result && (
        <div style={{ marginTop: "20px", padding: "15px", border: "1px solid", borderColor: result.error ? "#ff4444" : "#44cc44", borderRadius: "4px", background: result.error ? "#ffe6e6" : "#e6ffe6", maxHeight: "200px", overflowY: "auto", fontSize: "0.9rem", color: "#333" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 400, marginBottom: "10px" }}>{result.error ? "Error" : "Result"}</h3>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default Register;