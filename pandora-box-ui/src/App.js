import React, { useState, useEffect, useRef, useCallback } from "react";
import { ethers } from "ethers";
import QRCode from "qrcode";
import jsQR from "jsqr";
import QrCode from "qrcode-reader";
import { contractAddress } from "./contractAddress.js";
import Chatbot from "./Chatbot.js";

// Validate the contract address
if (!ethers.isAddress(contractAddress)) {
  throw new Error(`Invalid contract address in contractAddress.js: ${contractAddress}`);
}

// Use environment variable for private key (secure for production)
const privateKey = process.env.REACT_APP_PRIVATE_KEY;

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
    inputs: [{ internalType: "bytes32", name: "_productId", type: "bytes32" }],
    name: "getVerifications",
    outputs: [
      {
        components: [
          { internalType: "address", name: "verifier", type: "address" },
          { internalType: "uint256", name: "timestamp", type: "uint256" },
        ],
        internalType: "struct PandoraBoxAuthenticator.Verification[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "_productId", type: "bytes32" }],
    name: "getProduct",
    outputs: [
      { internalType: "bool", name: "exists", type: "bool" },
      { internalType: "string", name: "name", type: "string" },
      { internalType: "address", name: "registeredBy", type: "address" },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
      { internalType: "uint256", name: "blockNumber", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
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
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordChangeError, setPasswordChangeError] = useState(null);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Add hardcoded registration dates to existing users
  useEffect(() => {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    let updated = false;
    users.forEach((user) => {
      if (!user.registrationDate) {
        user.registrationDate = "2025-01-01 12:00:00 AM";
        updated = true;
      }
    });
    if (updated) {
      localStorage.setItem("users", JSON.stringify(users));
    }
  }, []);

  // Assign existing products to the first seller
  useEffect(() => {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const products = JSON.parse(localStorage.getItem("registeredProducts") || "[]");
    const firstSeller = users.find((u) => u.role === "seller")?.username;
    
    if (firstSeller && products.length > 0) {
      let updated = false;
      const updatedProducts = products.map((product) => {
        if (!product.seller) {
          updated = true;
          return { ...product, seller: firstSeller };
        }
        return product;
      });

      if (updated) {
        localStorage.setItem("registeredProducts", JSON.stringify(updatedProducts));
        console.log(`Assigned ${updatedProducts.length} products to first seller: ${firstSeller}`);
      }
    }
  }, []);

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

        // Get local verifications from localStorage
        const localVerifications = JSON.parse(localStorage.getItem("productVerifications") || "[]").filter(
          (v) => v.productId === productId
        );

        if (!verifications || verifications.length === 0) {
          console.log(`No verifications found for ${productId}`);
          setProductVerifications((prev) => ({
            ...prev,
            [productId]: [],
          }));
          return;
        }

        // Merge blockchain verifications with local usernames
        const formattedVerifications = verifications.map((v, index) => {
          const localMatch = localVerifications[index] || {};
          return {
            verifier: v.verifier,
            timestamp: new Date(Number(v.timestamp)).toLocaleString(),
            username: localMatch?.username || "anonymous",
          };
        });

        console.log(`Verifications for ${productId}:`, formattedVerifications);
        setProductVerifications((prev) => ({
          ...prev,
          [productId]: formattedVerifications,
        }));
      } catch (e) {
        console.error(`Failed to fetch ${productId}: ${e.message}`);
        setProductVerifications((prev) => ({
          ...prev,
          [productId]: [{ error: `Failed to load ${e.message}` }],
        }));
      }
    }, [contract]);

  const verifyProductById = useCallback(
    async (id) => {
      if (!contract) {
        setResultVerify({ error: "Blockchain not connected. Please log in and try again." });
        return;
      }
      if (!id.trim()) {
        setResultVerify({ error: "Product ID cannot be empty." });
        return;
      }
      setLoadingVerify(true);
      setResultVerify(null);
      try {
        const bytes32Id = ethers.stringify(id);

        // Check if product exists on-chain
        const productCheck = await getProduct();
        if (!productCheck[0]) {
          setResultVerify({ error: "Product not registered yet." });
          setLoadingVerify(false);
          return;
        }

        // Call verifyProduct transaction
        const tx = await verifyProduct();
        await tx.wait();

        // Fetch product details after verification
        const [exists, name, registeredBy, timestamp, blockNumber] = await getProduct();

        if (!exists) {
          setResultVerify({ error: "Product not found after verification." });
          return;
        }

        const formattedTime = new Date(Number(timestamp) * 1000).toLocaleString();

        // Save verification with username in localStorage
        const loggedInUser = localStorage.getItem("loggedInUser");
        const verificationTime = Math.floor(Date.now() / 1000);
        const localVerifications = JSON.parse(localStorage.getItem("Verifications"productVerifications") || "[]");
        localVerifications.push({
          id,
          productId: username,
          username: loggedInUser || "Anonymous",
          verificationTime,
        });
        localStorage.setItem("productVerifications", JSON.stringify(localVerifications));

        setResultVerify({
          exists,
          name,
          registeredBy,
          formattedTime,
          timestamp: blockNumber.toString(),
          verificationTime,
        });

        fetchVerifications(id);
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
    setLoginError(null);
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
    setRegisterError(null);
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    if (users.some((u) => u.username === username)) {
      setRegisterError("Username already exists");
    } else if (username === "" || password === "") {
      setRegisterError("Username and password cannot be empty");
    } else {
      users.push({ username, password, role, registrationDate: new Date().toLocaleString() });
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
    setResultRegister(null);
    setResultVerify(null);
    setQrCodeUrl(null);
    setQrCodeText("");
    stopScanner();
    setQrImagePreview(null);
    setIsNavMenuOpen(false);
  };

  const registerProduct = async () => {
    if (!contract) {
      setResultRegister({ error: "Blockchain not connected." });
      return;
    }
    if (!name.trim() || !productId.trim()) {
      setResultRegister({ error: "Product name and ID cannot be empty." });
      return;
    }

    // Check for duplicate product ID
    const products = JSON.parse(localStorage.getItem("registeredProducts") || "[]");
    if (products.some((p) => p.productId === productId)) {
      setResultRegister({ error: "Product ID already exists. Please use a unique ID." });
      return;
    }

    setLoadingRegister(true);
    setResultRegister(null);
    try {
      const bytes32Id = ethers.encodeBytes32String(productId);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const tx = await contract["registerProduct(string,bytes32,uint256)"](
        name,
        bytes32Id,
        currentTimestamp,
        { gasLimit: 300000 }
      );
      await tx.wait();

      // Save product with seller username
      const loggedInUser = localStorage.getItem("loggedInUser");
      products.push({ name, productId, timestamp: currentTimestamp, seller: loggedInUser });
      localStorage.setItem("registeredProducts", JSON.stringify(products));

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
      setResultRegister({
        error: error.message || "Failed to register product. Please try again.",
      });
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
      setScanStatus("Scanning... Please align the QR code.");
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
                setScanStatus("Invalid QR code format: No productId found.");
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

  const handleChatbotAction = (action) => {
    switch (action) {
      case "logout":
        handleLogout();
        break;
      case "registerProduct":
        setView("registerProduct");
        setIsNavMenuOpen(false);
        break;
      case "verify":
        setView("verify");
        setIsNavMenuOpen(false);
        break;
      case "sellerDashboard":
        setView("sellerDashboard");
        setIsNavMenuOpen(false);
        break;
      default:
        console.log("Unknown chatbot action:", action);
    }
  };

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
    const loggedInUser = localStorage.getItem("loggedInUser");
    const products = JSON.parse(localStorage.getItem("registeredProducts") || "[]").filter(
      (p) => p.seller === loggedInUser
    );
    return (
      <div style={{ background: isDarkMode ? "#2a2a2a" : "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", textAlign: "center", maxWidth: "600px", width: "100%" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "20px", fontWeight: 500, color: isDarkMode ? "#fff" : "#333" }}>Seller Dashboard</h2>
        {contractLoading && <p>Loading blockchain connection...</p>}
        {contractError && <p style={{ color: isDarkMode ? "#ff9999" : "#721c24" }}>{contractError}</p>}
        <button onClick={() => setView("registerProduct")} style={{ width: "100%", padding: "12px", background: isDarkMode ? "#007bff" : "#333", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", marginBottom: "15px", transition: "background 0.3s" }}>
          Register Product
        </button>
        {products.length > 0 ? (
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
                                <li key={i}>{v.username} - {v.timestamp}</li>
                              ))}
                            </ul>
                          ) : (
                            <p style={{ marginTop: "5px", color: isDarkMode ? "#999" : "#666" }}>No verifications yet</p>
                          )
                        ) : (
                          <p style={{ marginTop: "5px", color: isDarkMode ? "#ff9999" : "#721c24" }}>{productVerifications[product.productId][0].error}</p>
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
        ) : (
          <p style={{ marginTop: "20px", color: isDarkMode ? "#999" : "#666" }}>No products registered yet.</p>
        )}
      </div>
    );
  };

  const handleChangePassword = () => {
    setPasswordChangeError(null);
    setPasswordChangeSuccess(null);
    if (!newPassword.trim()) {
      setPasswordChangeError("New password cannot be empty.");
      return;
    }
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const loggedInUser = localStorage.getItem("loggedInUser");
    const userIndex = users.findIndex((u) => u.username === loggedInUser);
    if (userIndex === -1) {
      setPasswordChangeError("User not found.");
      return;
    }
    users[userIndex].password = newPassword;
    localStorage.setItem("users", JSON.stringify(users));
    setPasswordChangeSuccess("Password updated successfully!");
    setNewPassword("");
  };

  const renderProfileView = () => {
    const loggedInUser = localStorage.getItem("loggedInUser");
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const user = users.find((u) => u.username === loggedInUser);
    const registrationDate = user?.registrationDate || "Unknown";

    return (
      <div style={{ background: isDarkMode ? "#2a2a2a" : "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", textAlign: "center", maxWidth: "400px", width: "100%" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "20px", fontWeight: 500, color: isDarkMode ? "#fff" : "#333" }}>User Profile</h2>
        <p style={{ marginBottom: "10px", color: isDarkMode ? "#ccc" : "#666" }}>
          <strong>Username:</strong> {loggedInUser}
        </p>
        <p style={{ marginBottom: "10px", color: isDarkMode ? "#ccc" : "#666" }}>
          <strong>Role:</strong> {user?.role}
        </p>
        <p style={{ marginBottom: "20px", color: isDarkMode ? "#ccc" : "#666" }}>
          <strong>Registration Date:</strong> {registrationDate}
        </p>
        <h3 style={{ fontSize: "1.2rem", marginBottom: "10px", color: isDarkMode ? "#fff" : "#333" }}>Change Password</h3>
        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={{ width: "100%", padding: "12px", marginBottom: "15px", border: `1px solid ${isDarkMode ? "#444" : "#ccc"}`, borderRadius: "6px", fontSize: "1rem", outline: "none", boxSizing: "border-box", background: isDarkMode ? "#333" : "#fff", color: isDarkMode ? "#fff" : "#333" }}
        />
        <button
          onClick={handleChangePassword}
          style={{ width: "100%", padding: "12px", background: isDarkMode ? "#007bff" : "#333", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", marginBottom: "15px", transition: "background 0.3s" }}
        >
          Update Password
        </button>
        {passwordChangeError && (
          <div style={{ marginTop: "15px", padding: "10px", borderRadius: "6px", border: `1px solid ${isDarkMode ? "#d9534f" : "#d9534f"}`, background: isDarkMode ? "#3d2a2a" : "#f2dede", fontSize: "0.9rem", color: isDarkMode ? "#ff9999" : "#721c24" }}>
            <strong>Error</strong>
            <p style={{ margin: "5px 0 0" }}>{passwordChangeError}</p>
          </div>
        )}
        {passwordChangeSuccess && (
          <div style={{ marginTop: "15px", padding: "10px", borderRadius: "6px", border: `1px solid ${isDarkMode ? "#66cc66" : "#5cb85c"}`, background: isDarkMode ? "#2a3d2a" : "#dff0d8", fontSize: "0.9rem", color: isDarkMode ? "#fff" : "#333" }}>
            <strong>Success</strong>
            <p style={{ margin: "5px 0 0" }}>{passwordChangeSuccess}</p>
          </div>
        )}
        <button
          onClick={() => setView(user?.role === "seller" ? "sellerDashboard" : "customerDashboard")}
          style={{ width: "100%", padding: "12px", background: isDarkMode ? "#555" : "#666", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", marginTop: "10px", transition: "background 0.3s" }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  };

  const renderCustomerDashboard = () => (
    <div style={{ background: isDarkMode ? "#2a2a2a" : "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", textAlign: "center", maxWidth: "400px", width: "100%" }}>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "20px", fontWeight: 500, color: "#333" }}>Customer Dashboard</h2>
      {contractLoading && <p>Loading blockchain connection...</p>}
      {contractError && <p style={{ color: "#721c24" }}>{contractError}</p>}
      <p style={{ marginBottom: "10px", color: "#666" }}>
        Contract: {contract ? contract.address : "Not Connected ❌"}
        <br />
        Account: {account || "No account"}
      </p>
      <button onClick={() => setView("verify")} style={{ width: "100%", padding: "12px", background: "#333", border: "none", borderRadius: "6px", color: "#fff", fontSize: "1rem", cursor: "pointer", marginBottom: "15px", transition: "background 0.3s" }}>
        Verify Product
      </button>
    </div>
  );

  const renderRegisterProductView = () => (
    <div style={{ flex: "1", minWidth: "300px", background: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>
      <h2 style="font-size: 1.5rem; margin-bottom: 20px; color: #333;">Register Product</h2>
      <input type="text" placeholder="Product Name" value="" style="width: 100%; padding: 12px; margin-bottom: 15px; border: 2px solid #333; border-radius: 4px; font-size: 1rem;" />
      <input type="text" placeholder="ID" value="" style="width: 100%; padding: 12px; margin-bottom: 15px; border: 2px solid #333; border-radius: 4px; font-size: 1rem;" />
      <button style="width: 100%; padding: 12px; background: #333; border-radius: 4px; color: #fff; font-size: 1rem; cursor: pointer;">Register</button>
      <button style="width: 100%; margin-top: 20px; padding: 12px; background: #666; border-radius: 4px; color: #fff; font-size: 1rem; cursor: pointer;">Back</button>
    </div>
  );

  const renderVerifyView = () => (
    <div style={{ flex: 1, minWidth: 280px, background: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)"}}>
      <h2 style="font-size: 1.5rem; margin-bottom: 15px; color: #333;">Verify Product</h2>
      <input type="text" placeholder="Product ID" value="" style={{ marginBottom: "15px", width: "100%", border: "2px solid #333", padding: "10px", borderRadius: "4px", fontSize: "1rem" }} />
      <button style="width: 100%; padding: 12px; background: #333; border-radius: 4px; color: #fff; font-size: 1rem; cursor: pointer;">Verify Manually</button>
      <input type="file" accept="image/*" style="margin: 20px 0;" />
      <button style="width: 100%; padding: 12px; background: #28a745; border-radius: 4px; color: #fff; cursor: pointer;">Upload Image</button>
      <button style="width: 100%; margin-top: 10px; padding: 12px; background: #007bff; border-radius: 4px; color: #fff; cursor: pointer;">Scan Webcam</button>
      <button style="width: 100%; margin-top: 20px; padding: 12px; background: #666; border-radius: 4px; color: #fff; cursor: pointer;">Back</button>
    </div>
  );

  const loggedInUser = localStorage.getItem("loggedInUser");
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const userRole = loggedInUser ? users.find((u) => u.username === loggedInUser)?.role : null;

  const renderNavbar = () => (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: "#333",
        boxShadow: "0 2px 2px rgba(0,0,0,0.2)",
        padding: "10px 20px",
        display: flex,
        justifyContent: space-between,
        alignItems: center,
        zIndex: 1,
      }}
    >
      <div style={{ display: flex, alignItems: center }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: bold,
            margin: 0,
            cursor: pointer,
            color: #fff,
          }}
          onClick={() => {
            if (userRole === "seller") setView("sellerDashboard");
            else if (userRole === "customer") setView("customerDashboard");
            setIsNavMenuOpen(false);
          }}
        >
          PandoraBox
        </h1>
      </div>

      <div
        className="nav-links"
        style={{
          display: "flex",
          gap: "20px",
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {userRole === "seller" && (
          <>
            <button
              onClick={() => {
                setView("sellerDashboard");
                setIsNavMenuOpen(false);
              }}
              style={{
                background: none,
                border: none,
                color: view === "sellerDashboard" ? "#007bff" : "#fff",
                padding: "10px",
                cursor: pointer,
              }}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setView("registerProduct");
                setIsNavMenuOpen(false);
              }}
              style={{
                background: none,
                border: none,
                color: view === "registerProduct" ? "#007bff" : "#fff",
                padding: "10px",
                cursor: pointer,
              }}
            >
              Register Product
            </button>
          </>
        )}
        {userRole === "customer" && (
          <>
            <button
              onClick={() => {
                setView("customerDashboard");
                setIsNavMenuOpen(false);
              }}
              style={{
                background: none,
                border: none,
                color: view === "customerDashboard" ? "#007bff" : "#fff",
                padding: "10px",
                cursor: pointer,
              }}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setView("verify");
                setIsNavMenuOpen(false);
              }}
              style={{
                background: none,
                border: none,
                color: view === "verify" ? "#007bff" : "#fff",
                padding: "10px",
                cursor: pointer,
              }}
            >
              Verify Product
            </button>
          </>
        )}
        <button
          onClick={() => {
            setView("profile");
            setIsNavMenuOpen(false);
          }}
          style={{
            background: none,
            border: none,
            color: view === "profile" ? "#007bff" : "#fff",
            padding: "10px",
            cursor: pointer,
          }}
        >
          Profile
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        {loggedInUser && (
          <span style={{ color: "#fff" }}>
            {loggedInUser} ({userRole})
          </span>
        )}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          style={{
            padding: "10px",
            background: "#666",
            border: none,
            borderRadius: "4px",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Dark Mode
        </button>
        <button
          onClick={handleLogout}
          style={{
            padding: "10px",
            background: "#dc3545",
            border: none,
            borderRadius: "4px",
            color: "#fff",
            cursor: "pointer,
          }}
        >
          Logout
        </button>
        <button
          className="hamburger"
          onClick={() => setIsNavMenuOpen(!isNavMenuOpen)}
          style={{
            display: "none",
            background: none,
            border: none,
            fontSize: "1.5rem",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {isNavMenuOpen ? "…" : "≡"}
        </button>
      </div>

      {isNavMenuOpen && (
        <div
          className="mobile-menu"
          style={{
            position: absolute,
            top: "60px",
            left: "0",
            right: 0,
            background: "#333",
            padding: "10px 20px",
            display: flex,
            flex-direction: column,
            gap: 5px,
            zIndex: 0,
          }}
        >
          {userRole === "seller" && (
            <>
              <button
                onClick={() => {
                  setView("sellerDashboard");
                  setIsNavMenuOpen(false);
                }}
                style={{ color: "#007bff", padding: "10px", background: none, cursor: pointer }}
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  setView("registerProduct");
                  setIsNavMenuOpen(false);
                }}
                style={{ color: "#007bff", padding: "10px", background: none, cursor: pointer }}
              >
                Register Product
              </button>
            </>
          )}
          {userRole === "customer" && (
            <>
              <button
                onClick={() => {
                  setView("customerDashboard");
                  setIsNavMenuOpen(false);
                }}
                style={{ color: "#007bff", padding: "10px", background: none, cursor: pointer }}
              >
                Customer Dashboard
              </button>
              <button
                onClick={() => {
                  setView("verify");
                  setIsNavMenuOpen(false);
                }}
                style={{ color: "#007bff", padding: "10px", background: none, cursor: pointer }}
              >
                Verify Product
              </button>
            </>
          )}
          <button
            onClick={() => {
              setView("profile");
              setIsNavMenuOpen(false);
            }}
            style={{ color: "#007bff", padding: "10px", background: none, cursor: pointer }}
          >
            Profile
          </button>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{ color: "#007bff", padding: "10px", background: none, cursor: pointer }}
          >
            Dark Mode
          </button>
          <button
            onClick={handleLogout}
            style={{ color: "#007bff", padding: "10px", background: none, cursor: pointer }}
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );

  const styles = `
    @media (max-width: 768px) {
      .nav-links {
        display: none !important;
      }
      .hamburger {
        display: block !important;
      }
      .nav-right span {
        display: none !important;
      }
    }
    @media (min-width: 769px) {
      .mobile-menu {
        display: none !important;
      }
    }
  `;

  return (
    <div style={{ minHeight: "100vh", background: "#eee", padding: "80px 10px 10px 10px" }}>
      <style>{styles}</style>
      {view !== "login" && view !== "register" && renderNavbar()}
      <div style={{ display: flex, justifyContent: center }}>
        {view === "login" && <loginView />}
        {view === "register" && <registerView />}
        {view === "sellerDashboard" && <sellerDashboard />}
        {view === "customerDashboard" && <customerDashboard />}
        {view === "registerProduct" && <registerProductView />}
        {view === "verify" && <verifyView />}
        {view === "profile" && <profileView />}
      </div>
      {view !== "login" && view !== "register" && (
        <Chatbot
          isDarkMode={false}
          userRole="seller"
          onAction={() => console.log("Action!")}
        />
      )}
      <canvas></canvas>
    </div>
  );
}

export default App;