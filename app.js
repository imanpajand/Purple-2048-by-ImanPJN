// Purple 2048 by ImanPJN - app.js

const CONTRACT_ADDRESS = "0xc08279d91abf58a454a5cea8f072b7817409e485";
const ABI = [
  "function gm(string name, uint256 score) external",
  "event GM(string name, uint256 score, address player, uint256 timestamp)"
];

let provider, signer, contract;
let currentScore = 0;
let gameOver = false;
let tileExistsPreviously = Array.from({ length: 4 }, () => Array(4).fill(false));

window.onload = async () => {
  try {
    if (window.sdk?.actions?.ready) {
      await window.sdk.actions.ready();
      console.log("✅ sdk.actions.ready() called");
    }
  } catch (err) {
    console.error("❌ sdk ready error:", err);
  }

  initGame();
  setupControls();
  document.getElementById("scoreForm").addEventListener("submit", submitScore);
  document.getElementById("gmButton").addEventListener("click", sendGM);
  document.getElementById("leaderboardToggle").addEventListener("click", toggleLeaderboard);
  document.getElementById("connectWalletBtn").addEventListener("click", connectWallet);
};

async function connectWallet() {
  try {
    let eth = null;

    // 1. Base App via Farcaster Frame (Desktop)
    if (window.ethereum && window.ethereum.isFrame) {
      eth = window.ethereum;
      console.log("🟣 Base App Frame Wallet Detected");
    }
    // 2. Rabby or MetaMask
    else if (window.ethereum) {
      eth = window.ethereum;
      const chainId = await eth.request({ method: 'eth_chainId' });
      if (chainId !== "0x2105") {
        try {
          await eth.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x2105" }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await eth.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: "0x2105",
                chainName: "Base Mainnet",
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: ["https://mainnet.base.org"],
                blockExplorerUrls: ["https://basescan.org"],
              }],
            });
          } else {
            throw switchError;
          }
        }
      }
      console.log("🦊 MetaMask or Rabby Wallet Detected");
    }
    // 3. Farcaster Mobile Wallet via sdk.wallet.getEthereumProvider()
    else if (window.sdk?.wallet?.getEthereumProvider) {
      try {
        eth = await window.sdk.wallet.getEthereumProvider();
        console.log("🟣 Farcaster Mobile Wallet via MiniApp SDK Detected");
      } catch (err) {
        console.warn("⚠️ Farcaster provider error:", err);
      }
    }
    // 4. WalletConnect fallback
    if (!eth) {
      const wc = new WalletConnectProvider.default({
        rpc: { 8453: "https://mainnet.base.org" },
        chainId: 8453
      });
      await wc.enable();
      eth = wc;
      console.log("🔗 WalletConnect fallback used");
    }

    if (!eth) throw new Error("No wallet found");

    provider = new ethers.BrowserProvider(eth);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    const address = await signer.getAddress();
    document.getElementById("connectWalletBtn").innerText = `✅ ${address.slice(0, 6)}...${address.slice(-4)}`;

  } catch (err) {
    console.error("Connect Error:", err);
    alert("❌ اتصال کیف پول با خطا مواجه شد.");
  }
}

async function sendGM() {
  if (!contract) return alert("اول کیف پول رو وصل کن");
  try {
    const tx = await contract.gm("Gm to Iman", 0);
    await tx.wait();
    alert("✅GM به خودت عزیزم");
    loadLeaderboard();
  } catch (err) {
    console.error("GM Error:", err);
    alert("❌ ارسال GM با خطا مواجه شد.");
  }
}

async function submitScore(e) {
  e.preventDefault();
  if (!contract) return alert("اول کیف پول رو وصل کن");
  const name = document.getElementById("playerName").value.trim();
  if (!name) return alert("نام بازیکن وارد کن");
  try {
    const tx = await contract.gm(name, currentScore);
    await tx.wait();
    alert("🎯 امتیازت ثبت شد خوشگله!");
    document.getElementById("playerName").value = "";
    loadLeaderboard();
    resetGame();
  } catch (err) {
    console.error("Submit Error:", err);
    alert("❌ ثبت امتیاز با خطا مواجه شد.");
  }
}

async function loadLeaderboard() {
  if (!provider) {
    provider = new ethers.BrowserProvider(window.ethereum);
  }
  const readContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  const latestBlock = await provider.getBlockNumber();
  const logs = await readContract.queryFilter("GM");
  const leaderboard = {};
  logs.forEach(log => {
    const name = log.args.name;
    const score = Number(log.args.score);
    if (!leaderboard[name] || score > leaderboard[name]) {
      leaderboard[name] = score;
    }
  });
  const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);
  const lbDiv = document.getElementById("leaderboard");
  lbDiv.innerHTML = "<h3>🏆 Leaderboard</h3>";
  if (sorted.length === 0) {
    lbDiv.innerHTML += "<p>هنوز امتیازی ثبت نشده!</p>";
  } else {
    sorted.slice(0, 10).forEach(([name, score], i) => {
      lbDiv.innerHTML += `<div>${i + 1}. <strong>${name}</strong>: ${score}</div>`;
    });
  }
}

function toggleLeaderboard() {
  const lb = document.getElementById("leaderboard");
  const btn = document.getElementById("leaderboardToggle");
  if (lb.style.display === "none") {
    loadLeaderboard();
    lb.style.display = "block";
    btn.innerText = "Hide Leaderboard";
  } else {
    lb.style.display = "none";
    btn.innerText = "Show Leaderboard";
  }
}

function updateScoreDisplay() {
  const scoreEl = document.getElementById("score-display");
  if (scoreEl) {
    scoreEl.innerText = `Score: ${currentScore}`;
  }
}

// ----------------- GAME LOGIC ------------------
let grid = [];

function initGame() {
  grid = Array.from({ length: 4 }, () => Array(4).fill(0));
  tileExistsPreviously = Array.from({ length: 4 }, () => Array(4).fill(false));
  addRandomTile();
  addRandomTile();
  currentScore = 0;
  gameOver = false;
  updateGameBoard();
  updateScoreDisplay();
}

function resetGame() {
  initGame();
}

function setupControls() {
  window.onkeydown = (e) => {
    if (gameOver) return;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      move(e.key);
    }
  };
  let startX, startY;
  document.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  });
  document.addEventListener("touchend", (e) => {
    if (gameOver) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? "ArrowRight" : "ArrowLeft");
    } else {
      move(dy > 0 ? "ArrowDown" : "ArrowUp");
    }
  });
}

function addRandomTile() {
  const empty = [];
  grid.forEach((row, r) =>
    row.forEach((val, c) => {
      if (val === 0) empty.push([r, c]);
    })
  );
  if (empty.length === 0) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function updateGameBoard() {
  const gameDiv = document.getElementById("game");
  gameDiv.innerHTML = "";
  grid.forEach((row, r) =>
    row.forEach((val, c) => {
      const tile = document.createElement("div");
      const isNew = val > 0 && !tileExistsPreviously[r][c];
      tile.className = `tile tile-${val}${isNew ? ' new' : ''}`;
      tile.setAttribute("data-value", val > 0 ? val : "");
      gameDiv.appendChild(tile);
    })
  );
}

function move(direction) {
  const clone = JSON.parse(JSON.stringify(grid));
  const merged = Array.from({ length: 4 }, () => Array(4).fill(false));
  const combine = (row, rIndex) => {
    let arr = row.filter(Boolean);
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        currentScore += arr[i];
        arr[i + 1] = 0;
        merged[rIndex][i] = true;
      }
    }
    return arr.filter(Boolean).concat(Array(4 - arr.filter(Boolean).length).fill(0));
  };
  for (let i = 0; i < 4; i++) {
    let row;
    switch (direction) {
      case "ArrowLeft":
        grid[i] = combine(grid[i], i);
        break;
      case "ArrowRight":
        row = grid[i].slice().reverse();
        grid[i] = combine(row, i).reverse();
        break;
      case "ArrowUp":
        row = grid.map(r => r[i]);
        const colUp = combine(row, i);
        grid.forEach((r, j) => (r[i] = colUp[j]));
        break;
      case "ArrowDown":
        row = grid.map(r => r[i]).reverse();
        const colDown = combine(row, i).reverse();
        grid.forEach((r, j) => (r[i] = colDown[j]));
        break;
    }
  }
  if (JSON.stringify(grid) !== JSON.stringify(clone)) {
    tileExistsPreviously = clone.map(row => row.map(cell => cell > 0));
    addRandomTile();
    updateGameBoard();
    const tiles = document.querySelectorAll('.tile');
    let index = 0;
    grid.forEach((row, r) =>
      row.forEach((val, c) => {
        if (val !== 0 && merged[r][c]) {
          tiles[index].classList.add('merge');
        }
        index++;
      })
    );
    updateScoreDisplay();
    if (!canMove()) {
      gameOver = true;
      alert("💀 متاسفانه Game Over شدی! اما میتونی امتیازتو ثبت کنی.");
    }
  }
}

function canMove() {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) return true;
      if (c < 3 && grid[r][c] === grid[r][c + 1]) return true;
      if (r < 3 && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
}
