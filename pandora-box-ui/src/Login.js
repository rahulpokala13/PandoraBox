// src/Login.js
import React, { useState } from "react";

function Login() {
  const [role, setRole] = useState("seller"); // "seller" or "customer"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // Insert authentication logic here
    console.log(`Logging in as ${role}:`, email, password);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        color: "#333",
        padding: "20px"
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "40px",
          borderRadius: "10px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "400px"
        }}
      >
        <h1 style={{ textAlign: "center", marginBottom: "30px", fontSize: "2rem", fontWeight: 700 }}>
          Login
        </h1>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "30px" }}>
          <button
            onClick={() => setRole("seller")}
            style={{
              padding: "10px 20px",
              marginRight: "10px",
              background: role === "seller" ? "#333" : "#e0e0e0",
              color: role === "seller" ? "#fff" : "#333",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "1rem",
              transition: "background 0.3s"
            }}
          >
            Seller
          </button>
          <button
            onClick={() => setRole("customer")}
            style={{
              padding: "10px 20px",
              background: role === "customer" ? "#333" : "#e0e0e0",
              color: role === "customer" ? "#fff" : "#333",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "1rem",
              transition: "background 0.3s"
            }}
          >
            Customer
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "15px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              fontSize: "1rem",
              boxSizing: "border-box",
              outline: "none"
            }}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "25px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              fontSize: "1rem",
              boxSizing: "border-box",
              outline: "none"
            }}
            required
          />
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px",
              background: "#333",
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "1rem",
              cursor: "pointer",
              transition: "background 0.3s"
            }}
          >
            Login as {role.charAt(0).toUpperCase() + role.slice(1)}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;