import React, { useState, useEffect, useRef } from "react";

const Chatbot = ({ isDarkMode, userRole, onAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "bot", text: `Hello! I'm here to help you as a ${userRole || "user"}. What can I assist you with? Type "help" to see what I can do!` }
  ]);
  const [input, setInput] = useState("");
  const [lastUserIntent, setLastUserIntent] = useState(null); // To maintain context
  const messagesEndRef = useRef(null);

  // Scroll to the bottom of the chat when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Define intents with keyword groups for better matching
  const intents = {
    help: ["help", "what can you do", "assist", "support"],
    logout: ["logout", "log out", "sign out", "exit"],
    switchRole: ["switch role", "change role", "switch account", "change account"],
    contactSupport: ["contact support", "support", "helpdesk", "customer service"],
    // Seller-specific intents
    registerProduct: ["register", "add product", "create product", "register product", "new product", "list product"],
    viewProducts: ["view product", "see products", "list products", "my products", "show products"],
    troubleshootSeller: ["not working", "error", "issue", "problem", "failed"],
    // Customer-specific intents
    verifyProduct: ["verify", "check product", "verify product", "authenticate", "validate product"],
    scanQR: ["scan qr", "qr code", "scan code", "read qr", "qr scan"],
    troubleshootCustomer: ["not working", "error", "issue", "problem", "failed"],
  };

  // Function to detect the user's intent based on their message
  const detectIntent = (message) => {
    const lowerMessage = message.toLowerCase();
    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
        return intent;
      }
    }
    return null;
  };

  // Function to respond based on the detected intent
  const getResponseForIntent = (intent, userMessage) => {
    let botResponse = "Sorry, I didn't understand that. Can you rephrase?";
    let action = null;

    // General intents
    if (intent === "help") {
      botResponse = userRole === "seller"
        ? "As a seller, I can help you with:\n- Registering a product\n- Viewing your registered products\n- Logging out\n- Switching roles\n- Contacting support\nWhat would you like to do?"
        : "As a customer, I can help you with:\n- Verifying a product\n- Scanning a QR code\n- Logging out\n- Switching roles\n- Contacting support\nWhat would you like to do?";
    } else if (intent === "logout") {
      botResponse = "To log out, click the 'Logout' button on your dashboard. Would you like to do that now?";
      action = "logout";
    } else if (intent === "switchRole") {
      botResponse = "To switch roles, you'll need to log out and register a new account with the desired role (seller or customer). Would you like to log out now?";
      action = "logout";
    } else if (intent === "contactSupport") {
      botResponse = "You can reach support by emailing support@pandorabox.com. Would you like to know more?";
    }

    // Seller-specific intents
    if (userRole === "seller") {
      if (intent === "registerProduct") {
        botResponse = "To register a product, go to the Seller Dashboard and click 'Register Product'. Enter the product name and ID, then click 'Register'. Would you like to go there now?";
        action = "registerProduct";
      } else if (intent === "viewProducts") {
        botResponse = "You can view all your registered products in the Seller Dashboard under the 'Registered Products' section. Would you like to go there now?";
        action = "sellerDashboard";
      } else if (intent === "troubleshootSeller") {
        botResponse = "If product registration isn't working, ensure your Hardhat node is running (`npx hardhat node`) and check your internet connection. You can also try logging out and back in. Need more help?";
      }
    }

    // Customer-specific intents
    if (userRole === "customer") {
      if (intent === "verifyProduct") {
        botResponse = "To verify a product, go to the Customer Dashboard and click 'Verify Product'. You can enter the product ID manually or scan a QR code. Would you like to go there now?";
        action = "verify";
      } else if (intent === "scanQR") {
        botResponse = "To scan a QR code, go to the Verify Product page and click 'Scan QR with Webcam' or upload an image using 'Scan QR from Image'. Would you like to go there now?";
        action = "verify";
      } else if (intent === "troubleshootCustomer") {
        botResponse = "If verification isn't working, ensure your Hardhat node is running (`npx hardhat node`) and check your camera permissions for QR scanning. You can also try logging out and back in. Need more help?";
      }
    }

    // Handle role mismatch (e.g., customer trying to register a product)
    if (userRole === "customer" && intent === "registerProduct") {
      botResponse = "Registering a product is an action for sellers. As a customer, you can verify products instead. Would you like to verify a product now?";
      action = "verify";
    } else if (userRole === "seller" && (intent === "verifyProduct" || intent === "scanQR")) {
      botResponse = `Verifying a product is an action for customers. As a seller, you can register products instead. Would you like to register a product now?`;
      action = "registerProduct";
    }

    return { botResponse, action };
  };

  // Fallback response with suggestions based on user role
  const getFallbackResponse = () => {
    if (userRole === "seller") {
      return "I didn't understand that. As a seller, you can ask about registering a product, viewing your products, or logging out. Try saying 'register a product' or 'help' for more options.";
    } else if (userRole === "customer") {
      return "I didn't understand that. As a customer, you can ask about verifying a product, scanning a QR code, or logging out. Try saying 'verify a product' or 'help' for more options.";
    } else {
      return "I didn't understand that. Try saying 'help' to see what I can do for you.";
    }
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;

    // Add user's message to the chat
    setMessages((prev) => [...prev, { sender: "user", text: input }]);
    const userMessage = input.toLowerCase();
    setInput("");

    // Process the message and respond
    setTimeout(() => {
      let intent = detectIntent(userMessage);

      // If no intent is detected but we have context, try to refine the intent
      if (!intent && lastUserIntent) {
        if (lastUserIntent === "registerProduct" && userMessage.includes("product")) {
          intent = "registerProduct";
        } else if (lastUserIntent === "verifyProduct" && userMessage.includes("product")) {
          intent = "verifyProduct";
        }
      }

      setLastUserIntent(intent);

      let botResponse, action;
      if (intent) {
        ({ botResponse, action } = getResponseForIntent(intent, userMessage));
      } else {
        botResponse = getFallbackResponse();
      }

      setMessages((prev) => [...prev, { sender: "bot", text: botResponse, action }]);
    }, 500);
  };

  const handleAction = (action) => {
    onAction(action);
    setIsOpen(false); // Close the chatbot after an action
  };

  return (
    <div style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 1000 }}>
      {/* Chatbot Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: "12px 20px",
            background: isDarkMode ? "#007bff" : "#333",
            border: "none",
            borderRadius: "50%",
            color: "#fff",
            fontSize: "1.5rem",
            cursor: "pointer",
            boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
          }}
        >
          💬
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div
          style={{
            width: "300px",
            height: "400px",
            background: isDarkMode ? "#2a2a2a" : "#fff",
            borderRadius: "10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "10px",
              background: isDarkMode ? "#007bff" : "#333",
              color: "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1rem" }}>Pandora Box Assistant</h3>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "#fff",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              padding: "10px",
              overflowY: "auto",
              background: isDarkMode ? "#1a1a1a" : "#f5f5f5",
            }}
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "10px",
                  textAlign: msg.sender === "user" ? "right" : "left",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    padding: "8px 12px",
                    borderRadius: "12px",
                    background: msg.sender === "user" ? (isDarkMode ? "#007bff" : "#333") : isDarkMode ? "#444" : "#ddd",
                    color: msg.sender === "user" ? "#fff" : isDarkMode ? "#fff" : "#333",
                    maxWidth: "80%",
                  }}
                >
                  {msg.text}
                </span>
                {msg.action && (
                  <button
                    onClick={() => handleAction(msg.action)}
                    style={{
                      display: "block",
                      margin: "5px 0 0",
                      padding: "5px 10px",
                      background: isDarkMode ? "#1a73e8" : "#007bff",
                      border: "none",
                      borderRadius: "6px",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Take me there
                  </button>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px", borderTop: `1px solid ${isDarkMode ? "#444" : "#ccc"}` }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type your message..."
              style={{
                width: "100%",
                padding: "8px",
                border: `1px solid ${isDarkMode ? "#444" : "#ccc"}`,
                borderRadius: "6px",
                outline: "none",
                background: isDarkMode ? "#333" : "#fff",
                color: isDarkMode ? "#fff" : "#333",
              }}
            />
            <button
              onClick={handleSendMessage}
              style={{
                marginTop: "5px",
                width: "100%",
                padding: "8px",
                background: isDarkMode ? "#007bff" : "#333",
                border: "none",
                borderRadius: "6px",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot; 