const CONTRACT_ADDRESS = "0xba176303832da2e8679004c6add75c4f8c4655dc";
const ABI = [
  "function submitScore(string memory name, uint256 score) public",
  "event ScoreSubmitted(address indexed player, string name, uint256 score)"
];

let provider, signer, contract;
let currentScore = 0;
let gameOver = false;

window.onload = () => {
  initGame();
  document.getElementById("scoreForm").addEventListener("submit", submitScore);
  document.getElementById("gmButton").addEventListener("click", sendGM);
  document.getElementById("leaderboardToggle").addEventListener("click", toggleLeaderboard);
};

async function connectWallet() {
  if (window.ethereum) {
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    const address = await signer.getAddress();
    document.getElementById("connectWalletBtn").innerText = `✅ ${address.slice(0, 6)}...${address.slice(-4)}`;
  } else {
    alert("Please install MetaMask or a Web3 wallet");
  }
}

async function sendGM() {
  if (!contract || !signer) {
    alert("Please connect wallet first");
    return;
  }
  try {
    const address = await signer.getAddress();
    const name = `Gm to ${address.slice(0, 6)}`;
    const tx = await contract.submitScore(name, 0);
    await tx.wait();
    alert("🌞 GM sent to chain!");
    loadLeaderboard(); // Refresh leaderboard after GM
  } catch (err) {
    console.error(err);
    alert("❌ GM transaction failed.");
  }
}

async function submitScore(e) {
  e.preventDefault();
  if (!contract || !signer) {
    alert("Connect wallet first.");
    return;
  }
  const nameInput = document.getElementById("playerName");
  const name = nameInput.value.trim();
  if (!name) {
    alert("Please enter your name.");
    return;
  }

  try {
    const tx = await contract.submitScore(name, currentScore);
    await tx.wait();
    alert("🎉 Score submitted!");

    nameInput.value = "";
    loadLeaderboard();
    resetGame(); // بدون رفرش صفحه
  } catch (err) {
    console.error(err);
    alert("❌ Score submission failed.");
  }
}

async function loadLeaderboard() {
  if (!provider) provider = new ethers.BrowserProvider(window.ethereum || window);

  const readContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  const logs = await readContract.queryFilter("ScoreSubmitted");

  const leaderboard = {};
  logs.forEach(log => {
    const player = log.args.name;
    const score = parseInt(log.args.score);
    if (!leaderboard[player] || score > leaderboard[player]) {
      leaderboard[player] = score;
    }
  });

  const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);
  const lbDiv = document.getElementById("leaderboard");
  lbDiv.innerHTML = "<h3>🏆 Leaderboard</h3>";
  sorted.slice(0, 10).forEach(([name, score], index) => {
    lbDiv.innerHTML += `<p>${index + 1}. <strong>${name}</strong>: ${score}</p>`;
  });
}

function toggleLeaderboard() {
  const lb = document.getElementById("leaderboard");
  if (lb.style.display === "none") {
    loadLeaderboard();
    lb.style.display = "block";
    document.getElementById("leaderboardToggle").innerText = "Hide Leaderboard";
  } else {
    lb.style.display = "none";
    document.getElementById("leaderboardToggle").innerText = "Show Leaderboard";
  }
}

// ---------------------- GAME LOGIC ----------------------

let grid = [];

function initGame() {
  grid = Array(4).fill().map(() => Array(4).fill(0));
  addRandomTile();
  addRandomTile();
  currentScore = 0;
  gameOver = false;
  updateGameBoard();
  setupControls();
}

function resetGame() {
  initGame();
}

function setupControls() {
  window.onkeydown = (e) => {
    if (gameOver) return;
    const key = e.key;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
      move(key);
    }
  };

  // پشتیبانی از موبایل (سوایپ)
  let touchStartX, touchStartY;
  document.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });
  document.addEventListener("touchend", (e) => {
    if (gameOver) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
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
      tile.className = `tile tile-${val}`;
      tile.setAttribute("data-value", val > 0 ? val : "");
      gameDiv.appendChild(tile);
    })
  );
}

function move(direction) {
  let moved = false;
  const original = JSON.parse(JSON.stringify(grid));

  const combine = (row) => {
    let arr = row.filter(v => v);
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        currentScore += arr[i];
        arr[i + 1] = 0;
      }
    }
    return arr.filter(v => v).concat(Array(4 - arr.filter(v => v).length).fill(0));
  };

  for (let i = 0; i < 4; i++) {
    let row;
    switch (direction) {
      case "ArrowLeft":
        row = grid[i];
        grid[i] = combine(row);
        break;
      case "ArrowRight":
        row = grid[i].slice().reverse();
        grid[i] = combine(row).reverse();
        break;
      case "ArrowUp":
        row = grid.map(r => r[i]);
        let combinedUp = combine(row);
        grid.forEach((r, j) => (r[i] = combinedUp[j]));
        break;
      case "ArrowDown":
        row = grid.map(r => r[i]).reverse();
        let combinedDown = combine(row).reverse();
        grid.forEach((r, j) => (r[i] = combinedDown[j]));
        break;
    }
  }

  if (JSON.stringify(grid) !== JSON.stringify(original)) {
    addRandomTile();
    updateGameBoard();
    if (!canMove()) {
      gameOver = true;
      alert("💀 Game Over! Submit your score.");
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
