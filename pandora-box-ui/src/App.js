import React, { useState, useEffect, useRef, useCallback } from "react";
import { ethers } from "ethers";
import QRCode from "qrcode";
import jsQR from "jsqr";
const QrCode = require("qrcode-reader");

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Update if redeployed
const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const abi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "productId", type: "bytes32" },
      { indexed: false, internalType: "string", name: "name", type: "string" },
      { indexed: true, internalType: "address", name: "registeredBy", type: "address" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "blockNumber", type: "uint256" },
    ],
    name: "ProductRegistered",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "productId", type: "bytes32" },
      { indexed: true, internalType: "address", name: "verifier", type: "address" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "ProductVerified",
    type: "event",
  },
  
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "_name", type: "string" },
      { internalType: "bytes32", name: "_productId", type: "bytes32" },
      { internalType: "uint256", name: "_timestamp", type: "uint256" },
    ],
    name: "registerProduct",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "_name", type: "string" },
      { internalType: "bytes32", name: "_productId", type: "bytes32" },
    ],
    name: "registerProduct",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "_productId", type: "bytes32" }],
    name: "verifyProduct",
    outputs: [
      { internalType: "bool", name: "", type: "bool" },
      { internalType: "string", name: "", type: "string" },
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "_productId", "type": "bytes32" }],
    "name": "getVerifications",
    "outputs": [
      {
        "components": [
          { "internalType": "address", "name": "verifier", "type": "address" },
          { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "internalType": "struct PandoraBoxAuthenticator.Verification[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "_productId", "type": "bytes32" }
    ],
    "name": "getProduct",
    "outputs": [
      { "internalType": "bool", "name": "exists", "type": "bool" },
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "address", "name": "registeredBy", "type": "address" },
      { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
      { "internalType": "uint256", "name": "blockNumber", "type": "uint256" }
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
  const [view, setView] = useState(() => {
    const loggedInUser = localStorage.getItem("loggedInUser");
    if (loggedInUser) {
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const user = users.find((u) => u.username === loggedInUser);
      return user?.role === "seller" ? "sellerDashboard" : "customerDashboard";
    }
    return "login";
  });
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
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingRegisterUser, setLoadingRegisterUser] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [productVerifications, setProductVerifications] = useState({});
  const [contractLoading, setContractLoading] = useState(false);
  const [contractError, setContractError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const initializeContract = useCallback(async () => {
    if (contract) return;
    setContractLoading(true);
    setContractError(null);
    try {
      const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const wallet = new ethers.Wallet(privateKey, provider);
      const contractInstance = new ethers.Contract(contractAddress, abi, wallet);
      setContract(contractInstance);
      setAccount(wallet.address);
      console.log("Contract initialized with account:", wallet.address);

      const storedProducts = JSON.parse(localStorage.getItem("registeredProducts") || "[]");
      if (storedProducts.length > 0) {
        console.log("Re-registering", storedProducts.length, "stored products");
        for (const { name, productId, timestamp } of storedProducts) {
          try {
            const bytes32Id = ethers.encodeBytes32String(productId);
            const tx = await contractInstance["registerProduct(string,bytes32,uint256)"](
              name,
              bytes32Id,
              timestamp || Math.floor(Date.now() / 1000)
            );
            await tx.wait();
            console.log(`Re-registered '${name}' with ID '${productId}'`);
          } catch (error) {
            console.error(`Failed to re-register '${name}' (ID: ${productId}):`, error.message);
          }
        }
      }
    } catch (error) {
      console.error("Contract initialization failed:", error);
      setContractError("Failed to connect to blockchain. Ensure Hardhat node is running.");
    } finally {
      setContractLoading(false);
    }
  }, [contract]);

  useEffect(() => {
    if (localStorage.getItem("loggedInUser") && !contract && !contractLoading) {
      initializeContract();
    }
  }, [contract, contractLoading, initializeContract]);

  const fetchVerifications = useCallback(
    async (productId) => {
      if (!contract) {
        console.error("Contract not initialized for fetching verifications");
        return;
      }
      try {
        const bytes32Id = ethers.encodeBytes32String(productId);
        const verifications = await contract.getVerifications(bytes32Id);
        console.log(`Raw verifications for ${productId}:`, verifications);
        if (!verifications || verifications.length === 0) {
          console.log(`No verifications found for ${productId}`);
          setProductVerifications((prev) => ({
            ...prev,
            [productId]: [],
          }));
          return;
        }
        const formattedVerifications = verifications.map((v) => ({
          verifier: v.verifier,
          timestamp: new Date(Number(v.timestamp) * 1000).toLocaleString(),
        }));
        console.log(`Formatted verifications for ${productId}:`, formattedVerifications);
        setProductVerifications((prev) => {
          const updated = {
            ...prev,
            [productId]: formattedVerifications,
          };
          console.log("Updated productVerifications state:", updated);
          return updated;
        });
      } catch (error) {
        console.error(`Failed to fetch verifications for ${productId}:`, error.message);
        setProductVerifications((prev) => ({
          ...prev,
          [productId]: { error: "Failed to load verifications: " + error.message },
        }));
      }
    },
    [contract]
  );

  const verifyProductById = useCallback(
    async (id) => {
      if (!contract) {
        setResultVerify({ error: "Blockchain not connected. Please log in and try again." });
        return;
      }
      setLoadingVerify(true);
      setResultVerify(null);
      try {
        const bytes32Id = ethers.encodeBytes32String(id);
  
        // Send transaction to verify the product (records it on-chain)
        const tx = await contract.verifyProduct(bytes32Id);
        await tx.wait();
  
        // ✅ Access public mapping using `.get()` for ethers v6
        const [exists, name, registeredBy, timestamp, blockNumber] = await contract.getProduct(bytes32Id);
  
        if (exists) {
          const formattedTime = new Date(Number(timestamp) * 1000).toLocaleString();
          setResultVerify({
            exists: true,
            name,
            registeredBy,
            timestamp: formattedTime,
            blockNumber: blockNumber.toString(),
          });
          fetchVerifications(id);
        } else {
          setResultVerify({ message: "Product not found" });
        }
        
      } catch (error) {
        console.error("Verification error:", error);
        setResultVerify({ error: "Failed to verify product: " + (error.message || "Unknown error") });
      } finally {
        setLoadingVerify(false);
      }
    },
    [contract, fetchVerifications]
  );
  
  

  useEffect(() => {
    if (!contract || contractLoading) return;
    const urlParams = new URLSearchParams(window.location.search);
    const productIdFromUrl = urlParams.get("productId");
    if (productIdFromUrl && view === "customerDashboard") {
      setView("verify");
      setVerifyId(productIdFromUrl);
      verifyProductById(productIdFromUrl);
    }
  }, [view, contract, contractLoading, verifyProductById]);

  const handleLogin = async () => {
    setLoadingLogin(true);
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const user = users.find((u) => u.username === username && u.password === password);
    if (user) {
      localStorage.setItem("loggedInUser", username);
      setView(user.role === "seller" ? "sellerDashboard" : "customerDashboard");
      setLoginError(null);
      await initializeContract();
    } else {
      setLoginError("Invalid username or password");
    }
    setLoadingLogin(false);
  };

  const handleRegister = () => {
    setLoadingRegisterUser(true);
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    if (users.some((u) => u.username === username)) {
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
    setLoadingRegisterUser(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("loggedInUser");
    setContract(null);
    setAccount(null);
    setView("login");
    setContractError(null);
    setProductVerifications({});
  };

  const registerProduct = async () => {
    if (!contract) {
      setResultRegister({ error: "Blockchain not connected." });
      return;
    }
    setLoadingRegister(true);
    try {
      const bytes32Id = ethers.encodeBytes32String(productId);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const tx = await contract["registerProduct(string,bytes32,uint256)"](name, bytes32Id, currentTimestamp);
      await tx.wait();

      const products = JSON.parse(localStorage.getItem("registeredProducts") || "[]");
      if (!products.some((p) => p.productId === productId)) {
        products.push({ name, productId, timestamp: currentTimestamp });
        localStorage.setItem("registeredProducts", JSON.stringify(products));
      }

      const verifyUrl = `http://192.168.1.100:3000/verify?productId=${productId}`;
      const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#000000", light: "#FFFFFF" },
      });
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
    if (!contract) {
      setScanStatus("Blockchain not connected. Please log in first.");
      return;
    }
    setScanning(true);
    setScanStatus("Starting scanner...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
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
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    setScanning(false);
    setScanStatus("");
  };

  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.height = videoRef.current.videoHeight;
        canvas.width = videoRef.current.videoWidth;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            setScanStatus("QR Detected: " + code.data);
            try {
              const url = new URL(code.data);
              const productIdFromQR = url.searchParams.get("productId");
              if (productIdFromQR) {
                stopScanner();
                verifyProductById(productIdFromQR);
              } else {
                setScanStatus("Invalid QR code format");
              }
            } catch (error) {
              setScanStatus("Invalid QR code URL");
            }
          }
        }
      }
    }
    if (scanning) requestAnimationFrame(tick);
  };

  const scanQrFromImage = () => {
    if (!contract) {
      setResultVerify({ error: "Blockchain not connected. Please log in first." });
      return;
    }
    if (!qrImage) {
      setResultVerify({ error: "No image selected" });
      return;
    }
    setResultVerify({ message: "Processing image..." });
    setQrImagePreview(URL.createObjectURL(qrImage));

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0, img.width, img.height);
          let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let code = jsQR(imageData.data, imageData.width, imageData.height);

          if (!code) {
            const qr = new QrCode();
            qr.callback = (err, value) => {
              if (err) {
                setResultVerify({ error: "No QR code detected in image" });
              } else {
                try {
                  const url = new URL(value.result);
                  const productIdFromQR = url.searchParams.get("productId");
                  if (productIdFromQR) {
                    verifyProductById(productIdFromQR);
                  } else {
                    setResultVerify({ error: "No productId found in QR code" });
                  }
                } catch (error) {
                  setResultVerify({ error: "Invalid QR code URL format" });
                }
              }
            };
            qr.decode(imageData);
          } else {
            try {
              const url = new URL(code.data);
              const productIdFromQR = url.searchParams.get("productId");
              if (productIdFromQR) {
                verifyProductById(productIdFromQR);
              } else {
                setResultVerify({ error: "No productId found in QR code" });
              }
            } catch (error) {
              setResultVerify({ error: "Invalid QR code URL format" });
            }
          }
        }
      }
    };
    img.onerror = () => setResultVerify({ error: "Failed to load image" });
    img.src = URL.createObjectURL(qrImage);
  };

  const truncateAddress = (address) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  const renderLoginView = () => (
    <div style={{ background: isDarkMode ? "#2a2a2a" : "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", textAlign: "center", maxWidth: "400px", width: "100%" }}>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "20px", fontWeight: 500, color: isDarkMode ? "#fff" : "#333" }}>Login to Pandora Box</h2>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ width: "100%", padding: "12px", marginBottom: "15px", border: `1px solid ${isDarkMode ? "#444" : "#ccc"}`, borderRadius: "6px", fontSize: "1rem", outline: "none", boxSizing: "border-box", background: isDarkMode ? "#333" : "#fff", color: isDarkMode ? "#fff" : "#333" }}
        disabled={loadingLogin}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: "12px", marginBottom: "15px", border: `1px solid ${isDarkMode ? "#444" : "#ccc"}`, borderRadius: "6px", fontSize: "1rem", outline: "none", boxSizing: "border-box", background: isDarkMode ? "#333" : "#fff", color: isDarkMode ? "#fff" : "#333" }}
        disabled={loadingLogin}
      />
      <button
        onClick={handleLogin}
        disabled={loadingLogin}
        style={{ width: "100%", padding: "12px", background: loadingLogin ? (isDarkMode ? "#666" : "#999") : isDarkMode ? "#007bff" : "#333", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: loadingLogin ? "not-allowed" : "pointer", marginBottom: "10px", transition: "background 0.3s" }}
      >
        {loadingLogin ? "Logging in..." : "Login"}
      </button>
      <button onClick={() => setView("register")} style={{ width: "100%", padding: "12px", background: isDarkMode ? "#555" : "#666", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", transition: "background 0.3s" }} disabled={loadingLogin}>
        Register
      </button>
      {loginError && (
        <div style={{ marginTop: "15px", padding: "10px", borderRadius: "6px", border: `1px solid ${isDarkMode ? "#d9534f" : "#d9534f"}`, background: isDarkMode ? "#3d2a2a" : "#f2dede", fontSize: "0.9rem", color: isDarkMode ? "#ff9999" : "#721c24" }}>
          <strong>Error</strong>
          <p style={{ margin: "5px 0 0" }}>{loginError}</p>
        </div>
      )}
      {contractError && (
        <div style={{ marginTop: "15px", padding: "10px", borderRadius: "6px", border: `1px solid ${isDarkMode ? "#d9534f" : "#d9534f"}`, background: isDarkMode ? "#3d2a2a" : "#f2dede", fontSize: "0.9rem", color: isDarkMode ? "#ff9999" : "#721c24" }}>
          <strong>Blockchain Error</strong>
          <p style={{ margin: "5px 0 0" }}>{contractError}</p>
        </div>
      )}
    </div>
  );

  const renderRegisterView = () => (
    <div style={{ background: isDarkMode ? "#2a2a2a" : "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", textAlign: "center", maxWidth: "400px", width: "100%" }}>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "20px", fontWeight: 500, color: isDarkMode ? "#fff" : "#333" }}>Register for Pandora Box</h2>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ width: "100%", padding: "12px", marginBottom: "15px", border: `1px solid ${isDarkMode ? "#444" : "#ccc"}`, borderRadius: "6px", fontSize: "1rem", outline: "none", boxSizing: "border-box", background: isDarkMode ? "#333" : "#fff", color: isDarkMode ? "#fff" : "#333" }}
        disabled={loadingRegisterUser}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: "12px", marginBottom: "15px", border: `1px solid ${isDarkMode ? "#444" : "#ccc"}`, borderRadius: "6px", fontSize: "1rem", outline: "none", boxSizing: "border-box", background: isDarkMode ? "#333" : "#fff", color: isDarkMode ? "#fff" : "#333" }}
        disabled={loadingRegisterUser}
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        style={{ width: "100%", padding: "12px", marginBottom: "15px", border: `1px solid ${isDarkMode ? "#444" : "#ccc"}`, borderRadius: "6px", fontSize: "1rem", outline: "none", boxSizing: "border-box", background: isDarkMode ? "#333" : "#fff", color: isDarkMode ? "#fff" : "#333" }}
        disabled={loadingRegisterUser}
      >
        <option value="seller">Seller</option>
        <option value="customer">Customer</option>
      </select>
      <button
        onClick={handleRegister}
        disabled={loadingRegisterUser}
        style={{ width: "100%", padding: "12px", background: loadingRegisterUser ? (isDarkMode ? "#666" : "#999") : isDarkMode ? "#007bff" : "#333", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: loadingRegisterUser ? "not-allowed" : "pointer", marginBottom: "10px", transition: "background 0.3s" }}
      >
        {loadingRegisterUser ? "Registering..." : "Register"}
      </button>
      <button onClick={() => setView("login")} style={{ width: "100%", padding: "12px", background: isDarkMode ? "#555" : "#666", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", transition: "background 0.3s" }} disabled={loadingRegisterUser}>
        Back to Login
      </button>
      {registerError && (
        <div style={{ marginTop: "15px", padding: "10px", borderRadius: "6px", border: `1px solid ${isDarkMode ? "#d9534f" : "#d9534f"}`, background: isDarkMode ? "#3d2a2a" : "#f2dede", fontSize: "0.9rem", color: isDarkMode ? "#ff9999" : "#721c24" }}>
          <strong>Error</strong>
          <p style={{ margin: "5px 0 0" }}>{registerError}</p>
        </div>
      )}
    </div>
  );

  const renderSellerDashboard = () => {
    const products = JSON.parse(localStorage.getItem("registeredProducts") || "[]");
    return (
      <div style={{ background: isDarkMode ? "#2a2a2a" : "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", textAlign: "center", maxWidth: "600px", width: "100%" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "20px", fontWeight: 500, color: isDarkMode ? "#fff" : "#333" }}>Seller Dashboard</h2>
        {contractLoading && <p>Loading blockchain connection...</p>}
        {contractError && <p style={{ color: isDarkMode ? "#ff9999" : "#721c24" }}>{contractError}</p>}
        <button onClick={() => setView("registerProduct")} style={{ width: "100%", padding: "12px", background: isDarkMode ? "#007bff" : "#333", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", marginBottom: "15px", transition: "background 0.3s" }}>
          Register Product
        </button>
        <button onClick={handleLogout} style={{ width: "100%", padding: "12px", background: isDarkMode ? "#ff4444" : "#d9534f", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", transition: "background 0.3s" }}>
          Logout
        </button>
        {products.length > 0 && (
          <div style={{ marginTop: "20px", textAlign: "left" }}>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "10px", color: isDarkMode ? "#fff" : "#333" }}>Registered Products</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", color: isDarkMode ? "#fff" : "#333" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${isDarkMode ? "#444" : "#ccc"}` }}>
                  <th style={{ padding: "8px", textAlign: "left" }}>Name</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>ID</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Date</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Verifiers</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => (
                  <tr key={index} style={{ borderBottom: `1px solid ${isDarkMode ? "#333" : "#eee"}` }}>
                    <td style={{ padding: "8px" }}>{product.name}</td>
                    <td style={{ padding: "8px" }}>{product.productId}</td>
                    <td style={{ padding: "8px" }}>{new Date(product.timestamp * 1000).toLocaleDateString()}</td>
                    <td style={{ padding: "8px" }}>
                      <button onClick={() => fetchVerifications(product.productId)} style={{ padding: "4px 8px", background: isDarkMode ? "#1a73e8" : "#007bff", border: "none", borderRadius: "4px", color: "#fff", cursor: "pointer" }}>
                        Show
                      </button>
                      {productVerifications[product.productId] ? (
                        Array.isArray(productVerifications[product.productId]) ? (
                          productVerifications[product.productId].length > 0 ? (
                            <ul style={{ marginTop: "5px", paddingLeft: "20px" }}>
                              {productVerifications[product.productId].map((v, i) => (
                                <li key={i}>{truncateAddress(v.verifier)} - {v.timestamp}</li>
                              ))}
                            </ul>
                          ) : (
                            <p style={{ marginTop: "5px", color: isDarkMode ? "#999" : "#666" }}>No verifications yet</p>
                          )
                        ) : (
                          <p style={{ marginTop: "5px", color: isDarkMode ? "#ff9999" : "#721c24" }}>{productVerifications[product.productId].error}</p>
                        )
                      ) : (
                        <p style={{ marginTop: "5px", color: isDarkMode ? "#999" : "#666" }}>Click 'Show' to load verifications</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderCustomerDashboard = () => (
    <div style={{ background: isDarkMode ? "#2a2a2a" : "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", textAlign: "center", maxWidth: "400px", width: "100%" }}>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "20px", fontWeight: 500, color: isDarkMode ? "#fff" : "#333" }}>Customer Dashboard</h2>
      {contractLoading && <p>Loading blockchain connection...</p>}
      {contractError && <p style={{ color: isDarkMode ? "#ff9999" : "#721c24" }}>{contractError}</p>}
      <button onClick={() => setView("verify")} style={{ width: "100%", padding: "12px", background: isDarkMode ? "#007bff" : "#333", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", marginBottom: "15px", transition: "background 0.3s" }}>
        Verify Product
      </button>
      <button onClick={handleLogout} style={{ width: "100%", padding: "12px", background: isDarkMode ? "#ff4444" : "#d9534f", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", transition: "background 0.3s" }}>
        Logout
      </button>
    </div>
  );

  const renderRegisterProductView = () => (
    <div style={{ flex: "1", minWidth: "300px", background: isDarkMode ? "#2a2a2a" : "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "20px", fontWeight: 500, color: isDarkMode ? "#fff" : "#333" }}>Register Product</h2>
      {contractLoading && <p>Loading blockchain connection...</p>}
      {contractError && <p style={{ color: isDarkMode ? "#ff9999" : "#721c24" }}>{contractError}</p>}
      <input
        type="text"
        placeholder="Product Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ width: "100%", padding: "12px", marginBottom: "15px", border: `1px solid ${isDarkMode ? "#444" : "#ccc"}`, borderRadius: "6px", fontSize: "1rem", outline: "none", boxSizing: "border-box", background: isDarkMode ? "#333" : "#fff", color: isDarkMode ? "#fff" : "#333" }}
      />
      <input
        type="text"
        placeholder="Product ID"
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        style={{ width: "100%", padding: "12px", marginBottom: "15px", border: `1px solid ${isDarkMode ? "#444" : "#ccc"}`, borderRadius: "6px", fontSize: "1rem", outline: "none", boxSizing: "border-box", background: isDarkMode ? "#333" : "#fff", color: isDarkMode ? "#fff" : "#333" }}
      />
      <button
        onClick={registerProduct}
        disabled={loadingRegister || !contract || contractLoading}
        style={{ width: "100%", padding: "12px", background: loadingRegister || !contract || contractLoading ? (isDarkMode ? "#666" : "#999") : isDarkMode ? "#007bff" : "#333", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: loadingRegister || !contract || contractLoading ? "not-allowed" : "pointer", transition: "background 0.3s" }}
      >
        {loadingRegister ? "Processing..." : "Register"}
      </button>
      <button onClick={() => { setView("sellerDashboard"); setResultRegister(null); setQrCodeUrl(null); setQrCodeText(""); }} style={{ width: "100%", padding: "12px", background: isDarkMode ? "#555" : "#666", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", marginTop: "10px", transition: "background 0.3s" }}>
        Back
      </button>
      {resultRegister && (
        <div style={{ marginTop: "20px", padding: "15px", borderRadius: "6px", border: "1px solid", borderColor: resultRegister.error ? (isDarkMode ? "#ff6666" : "#d9534f") : isDarkMode ? "#66cc66" : "#5cb85c", background: resultRegister.error ? (isDarkMode ? "#3d2a2a" : "#f2dede") : isDarkMode ? "#2a3d2a" : "#dff0d8", fontSize: "0.9rem", color: isDarkMode ? "#fff" : "#333" }}>
          <strong>{resultRegister.error ? "Error" : "Success"}</strong>
          <p style={{ margin: "5px 0 0" }}>{resultRegister.error || resultRegister.message}</p>
          {qrCodeUrl && !resultRegister.error && (
            <div style={{ marginTop: "10px" }}>
              <p>QR Code URL: {qrCodeText}</p>
              <button onClick={() => { navigator.clipboard.writeText(qrCodeText); alert("URL copied to clipboard!"); }} style={{ padding: "8px", background: isDarkMode ? "#1a73e8" : "#007bff", border: "none", borderRadius: "6px", color: "#fff", fontSize: "0.9rem", cursor: "pointer", marginBottom: "10px" }}>
                Copy URL
              </button>
              <p>Download or scan this QR code:</p>
              <img src={qrCodeUrl} alt="Product QR Code" style={{ maxWidth: "100%" }} />
              <br />
              <a href={qrCodeUrl} download={`${productId}_qr.png`} style={{ color: isDarkMode ? "#1a73e8" : "#333", textDecoration: "underline" }}>Download QR Code</a>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderVerifyView = () => (
    <div style={{ flex: "1", minWidth: "300px", background: isDarkMode ? "#2a2a2a" : "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "20px", fontWeight: 500, color: isDarkMode ? "#fff" : "#333" }}>Verify Product</h2>
      {contractLoading && <p>Loading blockchain connection...</p>}
      {contractError && <p style={{ color: isDarkMode ? "#ff9999" : "#721c24" }}>{contractError}</p>}
      <input
        type="text"
        placeholder="Product ID"
        value={verifyId}
        onChange={(e) => setVerifyId(e.target.value)}
        style={{ width: "100%", padding: "12px", marginBottom: "15px", border: `1px solid ${isDarkMode ? "#444" : "#ccc"}`, borderRadius: "6px", fontSize: "1rem", outline: "none", boxSizing: "border-box", background: isDarkMode ? "#333" : "#fff", color: isDarkMode ? "#fff" : "#333" }}
      />
      <button
        onClick={() => verifyProductById(verifyId)}
        disabled={loadingVerify || !contract || contractLoading}
        style={{ width: "100%", padding: "12px", background: loadingVerify || !contract || contractLoading ? (isDarkMode ? "#666" : "#999") : isDarkMode ? "#007bff" : "#333", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: loadingVerify || !contract || contractLoading ? "not-allowed" : "pointer", transition: "background 0.3s" }}
      >
        {loadingVerify ? "Verifying..." : "Verify Manually"}
      </button>
      <input type="file" accept="image/*" onChange={(e) => setQrImage(e.target.files ? e.target.files[0] : null)} style={{ marginTop: "10px", marginBottom: "10px", color: isDarkMode ? "#fff" : "#333" }} />
      <button onClick={scanQrFromImage} disabled={!contract || contractLoading} style={{ width: "100%", padding: "12px", background: !contract || contractLoading ? (isDarkMode ? "#666" : "#999") : isDarkMode ? "#28a745" : "#28a745", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: !contract || contractLoading ? "not-allowed" : "pointer", marginBottom: "10px" }}>
        Scan QR from Image
      </button>
      <button onClick={scanning ? stopScanner : startScanner} disabled={!contract || contractLoading} style={{ width: "100%", padding: "12px", background: !contract || contractLoading ? (isDarkMode ? "#666" : "#999") : isDarkMode ? "#1a73e8" : "#007bff", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: !contract || contractLoading ? "not-allowed" : "pointer", marginBottom: "10px" }}>
        {scanning ? "Stop Scanning" : "Scan QR with Webcam"}
      </button>
      <button onClick={() => { setView("customerDashboard"); setResultVerify(null); stopScanner(); setQrImagePreview(null); }} style={{ width: "100%", padding: "12px", background: isDarkMode ? "#555" : "#666", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", transition: "background 0.3s" }}>
        Back
      </button>
      {qrImagePreview && (
        <div style={{ marginTop: "10px" }}>
          <p style={{ color: isDarkMode ? "#fff" : "#333" }}>Uploaded Image Preview:</p>
          <img src={qrImagePreview} alt="Uploaded QR" style={{ maxWidth: "100%", borderRadius: "6px" }} />
        </div>
      )}
      {scanning && (
        <>
          <video ref={videoRef} style={{ width: "100%", marginTop: "10px", borderRadius: "6px" }} />
          <p style={{ marginTop: "10px", fontSize: "0.9rem", color: isDarkMode ? "#1a73e8" : "#007bff" }}>{scanStatus}</p>
        </>
      )}
      {resultVerify && (
        <div style={{ marginTop: "20px", padding: "15px", borderRadius: "6px", border: "1px solid", borderColor: resultVerify.error ? (isDarkMode ? "#ff6666" : "#d9534f") : isDarkMode ? "#66cc66" : "#5cb85c", background: resultVerify.error ? (isDarkMode ? "#3d2a2a" : "#f2dede") : isDarkMode ? "#2a3d2a" : "#dff0d8", fontSize: "0.9rem", color: isDarkMode ? "#fff" : "#333" }}>
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
    <div style={{ minHeight: "100vh", background: isDarkMode ? "#1a1a1a" : "#f5f5f5", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px", fontFamily: "'Helvetica Neue', Arial, sans-serif", color: isDarkMode ? "#fff" : "#333", transition: "background 0.3s, color 0.3s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", maxWidth: "900px", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 700, color: isDarkMode ? "#fff" : "#333" }}>Pandora Box</h1>
        <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ padding: "8px 16px", background: isDarkMode ? "#555" : "#ddd", border: "none", borderRadius: "6px", color: isDarkMode ? "#fff" : "#333", cursor: "pointer", fontSize: "0.9rem", transition: "background 0.3s" }}>
          {isDarkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </div>
      {view !== "login" && view !== "register" && (
        <div style={{ textAlign: "center", marginBottom: "20px", color: isDarkMode ? "#ccc" : "#666" }}>
          Connected: {account ? truncateAddress(account) : "Not connected"} | Logged in as: {localStorage.getItem("loggedInUser") || "N/A"} (
          {(JSON.parse(localStorage.getItem("users") || "[]")).find((u) => u.username === localStorage.getItem("loggedInUser"))?.role || "N/A"})
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
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default App;