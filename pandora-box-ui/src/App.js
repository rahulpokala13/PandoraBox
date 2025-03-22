// src/App.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import { ethers } from "ethers";
import QRCode from "qrcode";
import jsQR from "jsqr";
const QrCode = require("qrcode-reader"); // Fallback library

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const abi = [
  {
    "inputs": [
      {"internalType": "string", "name": "_name", "type": "string"},
      {"internalType": "bytes32", "name": "_productId", "type": "bytes32"},
      {"internalType": "uint256", "name": "_timestamp", "type": "uint256"}
    ],
    "name": "registerProduct",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
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
      {"internalType": "uint256", "name": "", "type": "uint256"},
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
  const [view, setView] = useState(localStorage.getItem("loggedInUser") ? (JSON.parse(localStorage.getItem("users")).find(u => u.username === localStorage.getItem("loggedInUser")).role === "seller" ? "sellerDashboard" : "customerDashboard") : "login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("seller");
  const [loginError, setLoginError] = useState(null);
  const [registerError, setRegisterError] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [qrCodeText, setQrCodeText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [qrImage, setQrImage] = useState(null);
  const [qrImagePreview, setQrImagePreview] = useState(null);
  const [scanStatus, setScanStatus] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement("canvas"));

  const initializeContract = async () => {
    try {
      const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const wallet = new ethers.Wallet(privateKey, provider);
      const contractInstance = new ethers.Contract(contractAddress, abi, wallet);

      setContract(contractInstance);
      setAccount(wallet.address);

      const storedProducts = JSON.parse(localStorage.getItem("registeredProducts") || "[]");
      if (storedProducts.length > 0) {
        console.log("Re-registering stored products...");
        for (const { name, productId, timestamp } of storedProducts) {
          try {
            const bytes32Id = ethers.encodeBytes32String(productId);
            const tx = await contractInstance["registerProduct(string,bytes32,uint256)"](name, bytes32Id, timestamp);
            await tx.wait();
            console.log(`Re-registered '${name}' with ID '${productId}' and timestamp ${timestamp}`);
          } catch (error) {
            console.error(`Failed to re-register '${name}':`, error.message);
          }
        }
      }
    } catch (error) {
      console.error("Initialization failed:", error);
      setResultRegister({ error: "Failed to connect to contract" });
    }
  };

  if (localStorage.getItem("loggedInUser") && !contract) {
    initializeContract();
  }

  const verifyProduct = useCallback(async () => {
    if (!contract) {
      setResultVerify({ error: "Contract not initialized" });
      return;
    }
    setLoadingVerify(true);
    console.log("Verifying product with ID:", verifyId);
    try {
      const bytes32Id = ethers.encodeBytes32String(verifyId);
      console.log("Bytes32 ID:", bytes32Id);
      const [exists, prodName, registeredBy, timestamp, blockNumber] = await contract.verifyProduct(bytes32Id);
      console.log("Verification result:", { exists, prodName, registeredBy, timestamp, blockNumber });
      if (exists) {
        const formattedTime = new Date(Number(timestamp) * 1000).toLocaleString();
        setResultVerify({
          exists,
          name: prodName,
          registeredBy,
          timestamp: formattedTime,
          blockNumber: blockNumber.toString()
        });
      } else {
        setResultVerify({ message: "Product not found" });
      }
      setVerifyId("");
    } catch (error) {
      console.error("Verification error:", error);
      setResultVerify({ error: error.message });
    } finally {
      setLoadingVerify(false);
    }
  }, [contract, verifyId]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("productId");
    if (productId && view === "customerDashboard") {
      setVerifyId(productId);
      setView("verify");
      verifyProduct();
    }
  }, [view, verifyProduct]);

  const handleLogin = () => {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
      localStorage.setItem("loggedInUser", username);
      setView(user.role === "seller" ? "sellerDashboard" : "customerDashboard");
      setLoginError(null);
      initializeContract();
    } else {
      setLoginError("Invalid username or password");
    }
  };

  const handleRegister = () => {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    if (users.some(u => u.username === username)) {
      setRegisterError("Username already exists");
    } else if (username === "" || password === "") {
      setRegisterError("Username and password cannot be empty");
    } else {
      users.push({ username, password, role });
      localStorage.setItem("users", JSON.stringify(users));
      setView("login");
      setRegisterError(null);
      setUsername("");
      setPassword("");
      setRole("seller");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("loggedInUser");
    setContract(null);
    setAccount(null);
    setView("login");
  };

  const registerProduct = async () => {
    if (!contract) return;
    setLoadingRegister(true);
    try {
      const bytes32Id = ethers.encodeBytes32String(productId);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const tx = await contract["registerProduct(string,bytes32,uint256)"](name, bytes32Id, currentTimestamp);
      await tx.wait();

      const products = JSON.parse(localStorage.getItem("registeredProducts") || "[]");
      if (!products.some(p => p.productId === productId)) {
        products.push({ name, productId, timestamp: currentTimestamp });
        localStorage.setItem("registeredProducts", JSON.stringify(products));
      }

      const verifyUrl = `http://192.168.1.100:3000/verify?productId=${productId}`; // Replace with your IP
      console.log("Generating QR for URL:", verifyUrl);
      const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#000000", light: "#FFFFFF" }
      });
      console.log("QR Code generated, data URL length:", qrCodeDataUrl.length);
      setQrCodeUrl(qrCodeDataUrl);
      setQrCodeText(verifyUrl);

      setResultRegister({ message: `Registered ${name} with ID ${productId}` });
      setName("");
      setProductId("");
    } catch (error) {
      console.error("Registration error:", error);
      setResultRegister({ error: error.message });
    } finally {
      setLoadingRegister(false);
    }
  };

  const startScanner = async () => {
    setScanning(true);
    setScanStatus("Starting scanner...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: 640, height: 480 } });
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      setScanStatus("Scanning...");
      requestAnimationFrame(tick);
    } catch (error) {
      console.error("Scanner error:", error);
      setScanStatus("Error: " + error.message);
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setScanning(false);
    setScanStatus("");
  };

  const tick = () => {
    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      canvas.height = videoRef.current.videoHeight;
      canvas.width = videoRef.current.videoWidth;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      console.log("Scanning frame:", { width: imageData.width, height: imageData.height, code: code ? code.data : "No QR" });
      if (code) {
        console.log("QR Detected:", code.data);
        setScanStatus("QR Detected: " + code.data);
        const url = new URL(code.data);
        const productId = url.searchParams.get("productId");
        if (productId) {
          console.log("Product ID from QR:", productId);
          setVerifyId(productId);
          stopScanner();
          verifyProduct();
        } else {
          setScanStatus("Invalid QR code format");
        }
      }
    } else {
      console.log("Video not ready:", videoRef.current.readyState);
    }
    if (scanning) requestAnimationFrame(tick);
  };

  const scanQrFromImage = () => {
    if (!qrImage) {
      setResultVerify({ error: "No image selected" });
      return;
    }
    console.log("Scanning uploaded image:", qrImage.name);
    setResultVerify({ message: "Processing image..." });
    setQrImagePreview(URL.createObjectURL(qrImage));

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // Try original size
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let code = jsQR(imageData.data, imageData.width, imageData.height);
      console.log("jsQR Original Scan Result:", code);

      // Try scaled up if no QR detected
      if (!code) {
        console.log("No QR detected, attempting scaled scan...");
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0, img.width, img.height);
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        code = jsQR(imageData.data, imageData.width, imageData.height);
        console.log("jsQR Scaled Scan Result:", code);
      }

      // If jsQR still fails, use qrcode-reader
      if (!code) {
        console.log("jsQR failed, attempting qrcode-reader...");
        const qr = new QrCode();
        qr.callback = (err, value) => {
          if (err) {
            console.error("qrcode-reader error:", err);
            setResultVerify({ error: "No QR code detected in image" });
          } else {
            console.log("qrcode-reader Detected:", value.result);
            try {
              const url = new URL(value.result);
              const productId = url.searchParams.get("productId");
              if (productId) {
                setVerifyId(productId);
                verifyProduct();
              } else {
                setResultVerify({ error: "No productId found in QR code" });
              }
            } catch (error) {
              console.error("URL parsing error:", error);
              setResultVerify({ error: "Invalid QR code URL format" });
            }
          }
        };
        qr.decode(imageData);
      } else {
        console.log("jsQR Detected:", code.data);
        try {
          const url = new URL(code.data);
          const productId = url.searchParams.get("productId");
          if (productId) {
            setVerifyId(productId);
            verifyProduct();
          } else {
            setResultVerify({ error: "No productId found in QR code" });
          }
        } catch (error) {
          console.error("URL parsing error:", error);
          setResultVerify({ error: "Invalid QR code URL format" });
        }
      }
    };
    img.onerror = () => {
      console.error("Image load error");
      setResultVerify({ error: "Failed to load image" });
    };
    img.src = URL.createObjectURL(qrImage);
  };

  const truncateAddress = (address) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  const renderLoginView = () => (
    <div style={{ background: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", textAlign: "center", maxWidth: "400px", width: "100%" }}>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "20px", fontWeight: 500 }}>Login to Pandora Box</h2>
      <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "15px", border: "1px solid #ccc", borderRadius: "6px", fontSize: "1rem", outline: "none", boxSizing: "border-box" }} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "15px", border: "1px solid #ccc", borderRadius: "6px", fontSize: "1rem", outline: "none", boxSizing: "border-box" }} />
      <button onClick={handleLogin} style={{ width: "100%", padding: "12px", background: "#333", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", marginBottom: "10px", transition: "background 0.3s" }}>Login</button>
      <button onClick={() => setView("register")} style={{ width: "100%", padding: "12px", background: "#666", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", transition: "background 0.3s" }}>Register</button>
      {loginError && (
        <div style={{ marginTop: "15px", padding: "10px", borderRadius: "6px", border: "1px solid #d9534f", background: "#f2dede", fontSize: "0.9rem" }}>
          <strong>Error</strong>
          <p style={{ margin: "5px 0 0" }}>{loginError}</p>
        </div>
      )}
    </div>
  );

  const renderRegisterView = () => (
    <div style={{ background: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", textAlign: "center", maxWidth: "400px", width: "100%" }}>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "20px", fontWeight: 500 }}>Register for Pandora Box</h2>
      <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "15px", border: "1px solid #ccc", borderRadius: "6px", fontSize: "1rem", outline: "none", boxSizing: "border-box" }} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "15px", border: "1px solid #ccc", borderRadius: "6px", fontSize: "1rem", outline: "none", boxSizing: "border-box" }} />
      <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "15px", border: "1px solid #ccc", borderRadius: "6px", fontSize: "1rem", outline: "none", boxSizing: "border-box" }}>
        <option value="seller">Seller</option>
        <option value="customer">Customer</option>
      </select>
      <button onClick={handleRegister} style={{ width: "100%", padding: "12px", background: "#333", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", marginBottom: "10px", transition: "background 0.3s" }}>Register</button>
      <button onClick={() => setView("login")} style={{ width: "100%", padding: "12px", background: "#666", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", transition: "background 0.3s" }}>Back to Login</button>
      {registerError && (
        <div style={{ marginTop: "15px", padding: "10px", borderRadius: "6px", border: "1px solid #d9534f", background: "#f2dede", fontSize: "0.9rem" }}>
          <strong>Error</strong>
          <p style={{ margin: "5px 0 0" }}>{registerError}</p>
        </div>
      )}
    </div>
  );

  const renderSellerDashboard = () => (
    <div style={{ background: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", textAlign: "center", maxWidth: "400px", width: "100%" }}>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "20px", fontWeight: 500 }}>Seller Dashboard</h2>
      <button onClick={() => setView("registerProduct")} style={{ width: "100%", padding: "12px", background: "#333", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", marginBottom: "15px", transition: "background 0.3s" }}>Register Product</button>
      <button onClick={handleLogout} style={{ width: "100%", padding: "12px", background: "#d9534f", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", transition: "background 0.3s" }}>Logout</button>
    </div>
  );

  const renderCustomerDashboard = () => (
    <div style={{ background: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", textAlign: "center", maxWidth: "400px", width: "100%" }}>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "20px", fontWeight: 500 }}>Customer Dashboard</h2>
      <button onClick={() => setView("verify")} style={{ width: "100%", padding: "12px", background: "#333", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", marginBottom: "15px", transition: "background 0.3s" }}>Verify Product</button>
      <button onClick={handleLogout} style={{ width: "100%", padding: "12px", background: "#d9534f", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", transition: "background 0.3s" }}>Logout</button>
    </div>
  );

  const renderRegisterProductView = () => (
    <div style={{ flex: "1", minWidth: "300px", background: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "20px", fontWeight: 500 }}>Register Product</h2>
      <input type="text" placeholder="Product Name" value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "15px", border: "1px solid #ccc", borderRadius: "6px", fontSize: "1rem", outline: "none", boxSizing: "border-box" }} />
      <input type="text" placeholder="Product ID" value={productId} onChange={(e) => setProductId(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "15px", border: "1px solid #ccc", borderRadius: "6px", fontSize: "1rem", outline: "none", boxSizing: "border-box" }} />
      <button onClick={registerProduct} disabled={loadingRegister || !contract} style={{ width: "100%", padding: "12px", background: loadingRegister || !contract ? "#999" : "#333", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: loadingRegister || !contract ? "not-allowed" : "pointer", transition: "background 0.3s" }}>
        {loadingRegister ? "Processing..." : "Register"}
      </button>
      <button onClick={() => { setView("sellerDashboard"); setResultRegister(null); setQrCodeUrl(null); setQrCodeText(""); }} style={{ width: "100%", padding: "12px", background: "#666", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", marginTop: "10px", transition: "background 0.3s" }}>
        Back
      </button>
      {resultRegister && (
        <div style={{ marginTop: "20px", padding: "15px", borderRadius: "6px", border: "1px solid", borderColor: resultRegister.error ? "#d9534f" : "#5cb85c", background: resultRegister.error ? "#f2dede" : "#dff0d8", fontSize: "0.9rem" }}>
          <strong>{resultRegister.error ? "Error" : "Success"}</strong>
          <p style={{ margin: "5px 0 0" }}>{resultRegister.error || resultRegister.message}</p>
          {qrCodeUrl && !resultRegister.error && (
            <div style={{ marginTop: "10px" }}>
              <p>QR Code URL: {qrCodeText}</p>
              <p>Download this QR code or scan with your phone:</p>
              <img src={qrCodeUrl} alt="Product QR Code" style={{ maxWidth: "100%" }} />
              <br />
              <a href={qrCodeUrl} download={`${productId}_qr.png`} style={{ color: "#333", textDecoration: "underline" }}>Download QR Code</a>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderVerifyView = () => (
    <div style={{ flex: "1", minWidth: "300px", background: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "20px", fontWeight: 500 }}>Verify Product</h2>
      <input type="text" placeholder="Product ID" value={verifyId} onChange={(e) => setVerifyId(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "15px", border: "1px solid #ccc", borderRadius: "6px", fontSize: "1rem", outline: "none", boxSizing: "border-box" }} />
      <button onClick={verifyProduct} disabled={loadingVerify || !contract} style={{ width: "100%", padding: "12px", background: loadingVerify || !contract ? "#999" : "#333", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: loadingVerify || !contract ? "not-allowed" : "pointer", transition: "background 0.3s" }}>
        {loadingVerify ? "Processing..." : "Verify Manually"}
      </button>
      <input type="file" accept="image/*" onChange={(e) => setQrImage(e.target.files[0])} style={{ marginTop: "10px", marginBottom: "10px" }} />
      <button onClick={scanQrFromImage} style={{ width: "100%", padding: "12px", background: "#28a745", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", marginBottom: "10px" }}>Scan QR from Image</button>
      <button onClick={scanning ? stopScanner : startScanner} style={{ width: "100%", padding: "12px", background: "#007bff", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", marginBottom: "10px" }}>
        {scanning ? "Stop Scanning" : "Scan QR with Webcam"}
      </button>
      <button onClick={() => { setView("customerDashboard"); setResultVerify(null); stopScanner(); setQrImagePreview(null); }} style={{ width: "100%", padding: "12px", background: "#666", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", transition: "background 0.3s" }}>
        Back
      </button>
      {qrImagePreview && (
        <div style={{ marginTop: "10px" }}>
          <p>Uploaded Image Preview:</p>
          <img src={qrImagePreview} alt="Uploaded QR" style={{ maxWidth: "100%", borderRadius: "6px" }} />
        </div>
      )}
      {scanning && (
        <>
          <video ref={videoRef} style={{ width: "100%", marginTop: "10px", borderRadius: "6px" }} />
          <p style={{ marginTop: "10px", fontSize: "0.9rem", color: "#007bff" }}>{scanStatus}</p>
        </>
      )}
      {resultVerify && (
        <div style={{ marginTop: "20px", padding: "15px", borderRadius: "6px", border: "1px solid", borderColor: resultVerify.error ? "#d9534f" : "#5cb85c", background: resultVerify.error ? "#f2dede" : "#dff0d8", fontSize: "0.9rem" }}>
          <strong>{resultVerify.error ? "Error" : "Product Details"}</strong>
          {resultVerify.exists ? (
            <div style={{ marginTop: "5px", lineHeight: "1.5" }}>
              <p>Product: {resultVerify.name}</p>
              <p>Registered By: {truncateAddress(resultVerify.registeredBy)}</p>
              <p>Date: {resultVerify.timestamp}</p>
              <p>Block: {resultVerify.blockNumber}</p>
            </div>
          ) : (
            <p style={{ margin: "5px 0 0" }}>{resultVerify.message || resultVerify.error}</p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px", fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#333" }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "40px" }}>Pandora Box</h1>
      {view !== "login" && view !== "register" && (
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          Connected: {account ? truncateAddress(account) : "Not connected"} | Logged in as: {localStorage.getItem("loggedInUser")} ({JSON.parse(localStorage.getItem("users")).find(u => u.username === localStorage.getItem("loggedInUser"))?.role})
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", maxWidth: "900px", width: "100%", justifyContent: "center" }}>
        {view === "login" && renderLoginView()}
        {view === "register" && renderRegisterView()}
        {view === "sellerDashboard" && renderSellerDashboard()}
        {view === "customerDashboard" && renderCustomerDashboard()}
        {view === "registerProduct" && renderRegisterProductView()}
        {view === "verify" && renderVerifyView()}
      </div>
    </div>
  );
}

export default App;