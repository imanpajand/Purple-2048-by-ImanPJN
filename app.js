/*
 * =========================================
 * Purple 2048 - Main Application Logic
 * Consolidated and Final Version
 * =========================================
 */

// -----------------------------------
// SECTION 1: CORE VARIABLES & CONFIG
// -----------------------------------
let board, score = 0;
const size = 4;
const BASE_CHAIN_ID = "0x2105"; // Hex for 8453 (Base Mainnet)

// Your provided contract address
const CONTRACT_ADDRESS = "0xc08279d91abf58a454a5cea8f072b7817409e485";

const CONTRACT_ABI = [
  "function gm() public",
  "function submitScore(uint256 score, string memory playerName) public",
  "function getTopScores() public view returns (tuple(address player, uint256 score, string name)[])"
];

// Global variables for wallet connection
window.signer = null;
window.contract = null;

// -----------------------------------
// SECTION 2: WALLET & BLOCKCHAIN LOGIC
// -----------------------------------

// Network parameters using your dedicated Alchemy RPC
const BASE_PARAMS = {
  chainId: BASE_CHAIN_ID,
  chainName: "Base Mainnet",
  nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://base-mainnet.g.alchemy.com/v2/00eGcxP8BSNOMYfThP9H1"], // Your dedicated RPC URL
  blockExplorerUrls: ["https://basescan.org"],
};

async function connectWallet() {
  if (typeof window.ethereum === "undefined") {
    return alert("Please install a Web3 wallet like MetaMask or Rabby.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);

  try {
    // Request wallet connection
    await provider.send("eth_requestAccounts", []);
    const network = await provider.getNetwork();

    // Check and switch to the Base network
    if (network.chainId !== parseInt(BASE_CHAIN_ID, 16)) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: BASE_CHAIN_ID }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) { // If the network is not defined in the wallet
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [BASE_PARAMS],
          });
        } else {
          throw switchError;
        }
      }
    }
    
    // After ensuring connection and correct network
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    
    // Update the UI
    document.getElementById("connectWalletBtn").innerText = `🟢 ${address.slice(0, 6)}...${address.slice(-4)}`;
    document.getElementById("connectWalletBtn").disabled = true;

    // Store signer and contract instance in the window object for global access
    window.signer = signer;
    window.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  } catch (err) {
    console.error("Error connecting wallet:", err);
    alert("Failed to connect wallet. Please try again.");
  }
}

// -----------------------------------
// SECTION 3: CORE 2048 GAME LOGIC
// -----------------------------------

function initGame() {
  board = Array.from({ length: size }, () => Array(size).fill(0));
  score = 0;
  addNumber();
  addNumber();
  updateBoard();
  document.getElementById("scoreForm").style.display = "none";
  document.getElementById("leaderboard").style.display = "none";
}

function addNumber() {
  let empty = [];
  board.forEach((row, r) => row.forEach((val, c) => {
    if (val === 0) empty.push({ r, c });
  }));
  if (empty.length > 0) {
    const { r, c } = empty[Math.floor(Math.random() * empty.length)];
    board[r][c] = Math.random() < 0.9 ? 2 : 4;
  }
}

function updateBoard() {
  const gameContainer = document.getElementById("game");
  gameContainer.innerHTML = "";
  board.forEach(row => {
    row.forEach(val => {
      const tile = document.createElement("div");
      tile.className = `tile tile-${val}`;
      tile.dataset.value = val > 0 ? val : "";
      gameContainer.appendChild(tile);
    });
  });
}

function slideAndCombine(row) {
  let newRow = row.filter(val => val !== 0);
  for (let i = 0; i < newRow.length - 1; i++) {
    if (newRow[i] === newRow[i + 1]) {
      newRow[i] *= 2;
      score += newRow[i];
      newRow[i + 1] = 0;
    }
  }
  newRow = newRow.filter(val => val !== 0);
  while (newRow.length < size) {
    newRow.push(0);
  }
  return newRow;
}

function rotateClockwise(mat) {
  return mat[0].map((_, i) => mat.map(row => row[i]).reverse());
}

function rotateCounterClockwise(mat) {
  return mat[0].map((_, i) => mat.map(row => row[row.length - 1 - i]));
}

function checkGameOver() {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 0) return false; // Empty cell exists
      if (r < size - 1 && board[r][c] === board[r + 1][c]) return false; // Vertical move possible
      if (c < size - 1 && board[r][c] === board[r][c + 1]) return false; // Horizontal move possible
    }
  }
  return true; // No moves left
}

function showGameOver() {
  alert(`💀 Game Over!\n🏁 Final Score: ${score}`);
  document.getElementById("scoreForm").style.display = "block";
}

// -----------------------------------
// SECTION 4: CONTROLLERS & EVENT LISTENERS
// -----------------------------------

function setupEventListeners() {
  // Game movement controls
  document.onkeydown = (e) => {
    const originalBoardString = JSON.stringify(board);
    let played = true;

    switch (e.key) {
      case "ArrowLeft":
        board = board.map(row => slideAndCombine(row));
        break;
      case "ArrowRight":
        board = board.map(row => slideAndCombine(row.reverse()).reverse());
        break;
      case "ArrowUp":
        board = rotateCounterClockwise(board);
        board = board.map(row => slideAndCombine(row));
        board = rotateClockwise(board);
        break;
      case "ArrowDown":
        board = rotateClockwise(board);
        board = board.map(row => slideAndCombine(row));
        board = rotateCounterClockwise(board);
        break;
      default:
        played = false;
    }

    if (played && JSON.stringify(board) !== originalBoardString) {
      addNumber();
      updateBoard();
      if (checkGameOver()) {
        showGameOver();
      }
    }
  };

  // Connect wallet button
  document.getElementById("connectWalletBtn").addEventListener("click", connectWallet);

  // GM Button
  document.getElementById("gmButton").addEventListener("click", async () => {
    if (!window.contract) return alert("⛔️ First, connect your wallet");
    try {
      const tx = await window.contract.gm();
      await tx.wait();
      alert("🌞 GM sent successfully!");
    } catch (err) {
      alert("⛔ GM failed: " + (err.reason || err.message));
    }
  });

  // Score Submission Form
  document.getElementById("scoreForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!window.contract) return alert("⛔️ First, connect your wallet");

    const name = document.getElementById("playerName").value.trim();
    if (!name || score === 0) return alert("Invalid name or score");

    try {
      const tx = await window.contract.submitScore(score, name);
      await tx.wait();
      alert("✅ Your score was submitted to the blockchain!");
      // Reset the game after successful submission
      initGame();
    } catch (err) {
      alert("❌ Score submission failed: " + (err.reason || err.message));
    }
  });

  // Leaderboard Toggle Button
  document.getElementById("leaderboardToggle").addEventListener("click", async () => {
    if (!window.contract) return alert("⛔️ First, connect your wallet");
    
    const boardEl = document.getElementById("leaderboard");
    if (boardEl.style.display === "none") {
      try {
        const scores = await window.contract.getTopScores();
        boardEl.innerHTML = "<h3>🏆 Leaderboard</h3><ul>" + scores.map((s, i) =>
          `<li>#${i + 1} - ${s.name || "(unknown)"}: ${s.score}</li>`
        ).join("") + "</ul>";
        boardEl.style.display = "block";
      } catch (err) {
        alert("❌ Failed to fetch leaderboard: " + (err.reason || err.message));
      }
    } else {
      boardEl.style.display = "none";
    }
  });
}

// -----------------------------------
// SECTION 5: APP INITIALIZATION
// -----------------------------------
window.onload = () => {
  initGame();
  setupEventListeners();
};
