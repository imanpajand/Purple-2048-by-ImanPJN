let board, score = 0;
const size = 4;

const BASE_CHAIN_ID = 8453; // decimal format
const CONTRACT_ADDRESS = "0xc08279d91abf58a454a5cea8f072b7817409e485";
const CONTRACT_ABI = [
  "function gm(string name, uint256 score) external",
];

const provider = new ethers.JsonRpcProvider("https://base-mainnet.g.alchemy.com/v2/00eGcxP8BSNOMYfThP9H1");
let signer, contract;

// ----------- GAME CORE -----------
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
  const empty = [];
  board.forEach((row, r) => row.forEach((v, c) => {
    if (v === 0) empty.push({ r, c });
  }));
  if (empty.length === 0) return;
  const { r, c } = empty[Math.floor(Math.random() * empty.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function updateBoard() {
  const gameEl = document.getElementById("game");
  gameEl.innerHTML = "";
  board.forEach(row => row.forEach(val => {
    const tile = document.createElement("div");
    tile.className = `tile tile-${val}`;
    tile.dataset.value = val > 0 ? val : "";
    gameEl.appendChild(tile);
  }));
}

function slideAndCombine(row) {
  let newRow = row.filter(v => v !== 0);
  for (let i = 0; i < newRow.length - 1; i++) {
    if (newRow[i] === newRow[i + 1]) {
      newRow[i] *= 2;
      score += newRow[i];
      newRow[i + 1] = 0;
    }
  }
  newRow = newRow.filter(v => v !== 0);
  while (newRow.length < size) newRow.push(0);
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
      if (board[r][c] === 0) return false;
      if (r < size - 1 && board[r][c] === board[r + 1][c]) return false;
      if (c < size - 1 && board[r][c] === board[r][c + 1]) return false;
    }
  }
  return true;
}

function showGameOver() {
  alert(`💀 Game Over!\n🏁 Final Score: ${score}`);
  document.getElementById("scoreForm").style.display = "block";
}

// ----------- CONTROLS -----------
function move(direction) {
  const prev = JSON.stringify(board);
  switch (direction) {
    case "left":
      board = board.map(row => slideAndCombine(row));
      break;
    case "right":
      board = board.map(row => slideAndCombine(row.reverse()).reverse());
      break;
    case "up":
      board = rotateCounterClockwise(board);
      board = board.map(row => slideAndCombine(row));
      board = rotateClockwise(board);
      break;
    case "down":
      board = rotateClockwise(board);
      board = board.map(row => slideAndCombine(row));
      board = rotateCounterClockwise(board);
      break;
  }
  if (JSON.stringify(board) !== prev) {
    addNumber();
    updateBoard();
    if (checkGameOver()) showGameOver();
  }
}

function setupKeyboardAndTouch() {
  document.onkeydown = (e) => {
    switch (e.key) {
      case "ArrowLeft": move("left"); break;
      case "ArrowRight": move("right"); break;
      case "ArrowUp": move("up"); break;
      case "ArrowDown": move("down"); break;
    }
  };

  let startX, startY;
  document.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
  }, { passive: true });

  document.addEventListener("touchend", (e) => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) > 30) {
      if (absX > absY) {
        dx > 0 ? move("right") : move("left");
      } else {
        dy > 0 ? move("down") : move("up");
      }
    }
  }, { passive: true });
}

// ----------- WALLET + GM -----------
async function connectWallet() {
  if (!window.ethereum) return alert("🦊 Please install MetaMask or Rabby");

  const chainIdHex = "0x2105";
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const current = await window.ethereum.request({ method: "eth_chainId" });

    if (current !== chainIdHex) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chainIdHex }],
        });
      } catch (err) {
        if (err.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: chainIdHex,
              chainName: "Base Mainnet",
              rpcUrls: ["https://base-mainnet.g.alchemy.com/v2/00eGcxP8BSNOMYfThP9H1"],
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              blockExplorerUrls: ["https://basescan.org"]
            }]
          });
        } else {
          throw err;
        }
      }
    }

    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    signer = await browserProvider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    const address = await signer.getAddress();
    document.getElementById("connectWalletBtn").innerText = `🟢 ${address.slice(0, 6)}...${address.slice(-4)}`;
    document.getElementById("connectWalletBtn").disabled = true;
  } catch (err) {
    alert("❌ Wallet Error: " + (err.message || err));
  }
}

async function sendGM() {
  if (!contract || !signer) return alert("⛔ Wallet not connected");

  const network = await signer.provider.getNetwork();
  if (Number(network.chainId) !== BASE_CHAIN_ID) {
    return alert("⚠️ Please switch to Base Mainnet");
  }

  try {
    const playerName = prompt("👤 Enter your name:") || "anon";
    const tx = await contract.gm(playerName, score);
    await tx.wait();
    alert("🌞 GM submitted onchain!");
  } catch (err) {
    alert("❌ GM Error: " + (err.reason || err.message));
  }
}

// ----------- INIT -----------
window.onload = () => {
  initGame();
  setupKeyboardAndTouch();

  document.getElementById("connectWalletBtn").onclick = connectWallet;
  document.getElementById("gmButton").onclick = sendGM;
};
