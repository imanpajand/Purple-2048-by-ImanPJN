let board, score = 0;
const size = 4;

const BASE_CHAIN_ID = "0x2105"; // Base Mainnet (hex)
const CONTRACT_ADDRESS = "0xc08279d91abf58a454a5cea8f072b7817409e485";
const CONTRACT_ABI = [
  "function gm() public",
  "function submitScore(uint256 score, string memory playerName) public",
  "function getTopScores() public view returns (tuple(address player, uint256 score, string name)[])"
];

// RPC اختصاصی شما
const provider = new ethers.JsonRpcProvider("https://base-mainnet.g.alchemy.com/v2/00eGcxP8BSNOMYfThP9H1");
let signer, contract;

// ---------------- GAME CORE ----------------

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

// ---------------- CONTROLS ----------------

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
  // Keyboard
  document.onkeydown = (e) => {
    switch (e.key) {
      case "ArrowLeft": move("left"); break;
      case "ArrowRight": move("right"); break;
      case "ArrowUp": move("up"); break;
      case "ArrowDown": move("down"); break;
    }
  };

  // Touch
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

// ---------------- WALLET ----------------

async function connectWallet() {
  if (!window.ethereum) return alert("🦊 لطفاً متامسک یا Rabby نصب کن");

  const chainId = "0x2105"; // Base Mainnet

  try {
    // درخواست اتصال به کیف پول
    await window.ethereum.request({ method: "eth_requestAccounts" });

    // چک شبکه
    const currentChain = await window.ethereum.request({ method: "eth_chainId" });
    if (currentChain !== chainId) {
      try {
        // سوییچ شبکه به Base
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId }],
        });
      } catch (switchError) {
        // اگه شبکه Base وجود نداشت، اضافه‌ش کن
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId,
              chainName: "Base Mainnet",
              rpcUrls: ["https://base-mainnet.g.alchemy.com/v2/00eGcxP8BSNOMYfThP9H1"],
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              blockExplorerUrls: ["https://basescan.org"]
            }]
          });
        } else {
          throw switchError;
        }
      }
    }

    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    signer = await browserProvider.getSigner();
    const userAddress = await signer.getAddress();

    // مقداردهی اولیه قرارداد
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    document.getElementById("connectWalletBtn").innerText = `🟢 ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
    document.getElementById("connectWalletBtn").disabled = true;

  } catch (err) {
    alert("❌ خطا در اتصال به کیف پول: " + (err.message || err));
  }
}

// ---------------- INTERACTIONS ----------------

async function sendGM() {
  if (!contract || !signer) return alert("⛔ اول کیف پولتو وصل کن");

  const network = await signer.provider.getNetwork();
  if (network.chainId !== 8453) {
    return alert("⚠️ لطفاً روی شبکه Base Mainnet باشی");
  }

  try {
    const tx = await contract.gm();
    await tx.wait();
    alert("🌞 GM ثبت شد!");
  } catch (err) {
    alert("❌ خطا در GM: " + (err.reason || err.message));
  }
}

async function submitScoreHandler(e) {
  e.preventDefault();
  const name = document.getElementById("playerName").value.trim();
  if (!name || score === 0) return alert("نام یا امتیاز نامعتبره");
  if (!contract) return alert("⛔ اول کیف پولتو وصل کن");

  try {
    const tx = await contract.submitScore(score, name);
    await tx.wait();
    alert("✅ امتیاز ثبت شد!");
    initGame();
  } catch (err) {
    alert("❌ خطا در ثبت امتیاز: " + (err.reason || err.message));
  }
}

async function toggleLeaderboard() {
  if (!contract) return alert("⛔ اول کیف پولتو وصل کن");
  const board = document.getElementById("leaderboard");
  if (board.style.display === "none") {
    try {
      const scores = await contract.getTopScores();
      board.innerHTML = "<h3>🏆 Leaderboard</h3><ul>" + scores.map((s, i) =>
        `<li>#${i + 1} - ${s.name || "(unknown)"}: ${s.score}</li>`
      ).join("") + "</ul>";
      board.style.display = "block";
    } catch (err) {
      alert("❌ خطا در گرفتن لیدربرد: " + (err.reason || err.message));
    }
  } else {
    board.style.display = "none";
  }
}

// ---------------- INIT ----------------

window.onload = () => {
  initGame();
  setupKeyboardAndTouch();

  document.getElementById("connectWalletBtn").onclick = connectWallet;
  document.getElementById("gmButton").onclick = sendGM;
  document.getElementById("scoreForm").addEventListener("submit", submitScoreHandler);
  document.getElementById("leaderboardToggle").onclick = toggleLeaderboard;
};
