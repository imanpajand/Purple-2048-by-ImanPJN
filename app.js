let board, score = 0;
const size = 4;

const BASE_CHAIN_ID = "0x2105"; // Base Mainnet (hex)
const CONTRACT_ADDRESS = "0xc08279d91abf58a454a5cea8f072b7817409e485";
const CONTRACT_ABI = [
  "event GM(string name, uint256 score, address player, uint256 timestamp)",
  "function gm(string name, uint256 score) external",
];

const provider = new ethers.providers.JsonRpcProvider("https://base-mainnet.g.alchemy.com/v2/00eGcxP8BSNOMYfThP9H1");
let signer, contract;

// ---------- GAME LOGIC ----------

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

// ---------- CONTROLS ----------

function move(direction) {
  const prev = JSON.stringify(board);
  switch (direction) {
    case "left": board = board.map(row => slideAndCombine(row)); break;
    case "right": board = board.map(row => slideAndCombine(row.reverse()).reverse()); break;
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

function setupControls() {
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
    const t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
  }, { passive: true });

  document.addEventListener("touchend", (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - startX, dy = t.clientY - startY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 30) {
      if (Math.abs(dx) > Math.abs(dy)) dx > 0 ? move("right") : move("left");
      else dy > 0 ? move("down") : move("up");
    }
  }, { passive: true });
}

// ---------- WALLET ----------

async function connectWallet() {
  if (!window.ethereum) return alert("🦊 Install MetaMask or Rabby");

  const chainId = BASE_CHAIN_ID;

  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const currentChain = await window.ethereum.request({ method: "eth_chainId" });

    if (currentChain !== chainId) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId }]
        });
      } catch (err) {
        if (err.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId,
              chainName: "Base Mainnet",
              rpcUrls: [provider.connection.url],
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              blockExplorerUrls: ["https://basescan.org"]
            }]
          });
        } else throw err;
      }
    }

    const browserProvider = new ethers.providers.Web3Provider(window.ethereum);
    signer = browserProvider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    const address = await signer.getAddress();
    document.getElementById("connectWalletBtn").innerText = `🟢 ${address.slice(0, 6)}...${address.slice(-4)}`;
    document.getElementById("connectWalletBtn").disabled = true;

  } catch (err) {
    alert("❌ Wallet error: " + (err.message || err));
  }
}

// ---------- INTERACTIONS ----------

async function sendGM() {
  if (!signer || !contract) return alert("⛔ Connect wallet first");
  const network = await signer.provider.getNetwork();
  if (network.chainId !== 8453) return alert("⚠️ You must be on Base Mainnet");

  try {
    const tx = await contract.gm("GM to Iman", 0);
    await tx.wait();
    alert("🌞 GM sent!");
  } catch (err) {
    alert("❌ GM failed: " + (err.reason || err.message));
  }
}

async function submitScoreHandler(e) {
  e.preventDefault();
  const name = document.getElementById("playerName").value.trim();
  if (!name || score === 0) return alert("❗ Invalid name or score");
  if (!contract) return alert("⛔ Connect wallet first");

  try {
    const tx = await contract.gm(name, score);
    await tx.wait();
    alert("✅ Score submitted!");
    initGame(); // Reset game after transaction
  } catch (err) {
    alert("❌ Submit failed: " + (err.reason || err.message));
  }
}

async function loadLeaderboard() {
  const board = document.getElementById("leaderboard");
  board.innerHTML = "<h3>🏆 Leaderboard</h3><p>Loading...</p>";
  board.style.display = "block";

  try {
    const filter = contract.filters.GM();
    const logs = await provider.getLogs({
      fromBlock: 0,
      toBlock: "latest",
      address: CONTRACT_ADDRESS,
      topics: filter.topics
    });

    const iface = new ethers.utils.Interface(CONTRACT_ABI);
    const parsed = logs.map(log => iface.parseLog(log).args);
    const scores = parsed.map(args => ({
      name: args.name,
      score: args.score.toNumber(),
      player: args.player
    })).sort((a, b) => b.score - a.score).slice(0, 10);

    board.innerHTML = "<h3>🏆 Leaderboard</h3><ul>" + scores.map((s, i) =>
      `<li>#${i + 1} - ${s.name || "(anon)"}: ${s.score}</li>`
    ).join("") + "</ul>";

  } catch (err) {
    board.innerHTML = "<p>❌ Failed to load leaderboard</p>";
  }
}

// ---------- INIT ----------

window.onload = () => {
  initGame();
  setupControls();
  document.getElementById("connectWalletBtn").onclick = connectWallet;
  document.getElementById("gmButton").onclick = sendGM;
  document.getElementById("scoreForm").addEventListener("submit", submitScoreHandler);
  document.getElementById("leaderboardToggle").onclick = loadLeaderboard;
};
