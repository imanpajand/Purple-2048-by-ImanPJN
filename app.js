const CONTRACT_ADDRESS = "0xba176303832da2e8679004c6add75c4f8c4655dc";
const ABI = [
  "function gm(string name, uint256 score) external",
  "event GM(string name, uint256 score, address player, uint256 timestamp)"
];

let provider, signer, contract;
let currentScore = 0;
let gameOver = false;

window.onload = () => {
  initGame();
  document.getElementById("scoreForm").addEventListener("submit", submitScore);
  document.getElementById("gmButton").addEventListener("click", sendGM);
  document.getElementById("leaderboardToggle").addEventListener("click", toggleLeaderboard);
  connectWallet();
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
    alert("لطفاً کیف پولی مثل MetaMask نصب کنید.");
  }
}

async function sendGM() {
  if (!contract || !signer) {
    alert("لطفاً اول کیف پول رو وصل کن.");
    return;
  }
  try {
    const tx = await contract.gm("Gm to Iman", 0);
    await tx.wait();
    alert("✅ GM ثبت شد!");
    loadLeaderboard();
  } catch (err) {
    console.error(err);
    alert("❌ ارسال GM با خطا مواجه شد.");
  }
}

async function submitScore(e) {
  e.preventDefault();
  if (!contract || !signer) {
    alert("اول کیف پول رو وصل کن.");
    return;
  }
  const nameInput = document.getElementById("playerName");
  const name = nameInput.value.trim();
  if (!name) {
    alert("اسم رو وارد کن.");
    return;
  }

  try {
    const tx = await contract.gm(name, currentScore);
    await tx.wait();
    alert("🎉 امتیاز ثبت شد!");
    nameInput.value = "";
    loadLeaderboard();
    resetGame();
  } catch (err) {
    console.error(err);
    alert("❌ ثبت امتیاز با خطا مواجه شد.");
  }
}

async function loadLeaderboard() {
  if (!provider) provider = new ethers.BrowserProvider(window.ethereum || window);
  const readContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

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
  sorted.slice(0, 10).forEach(([name, score], i) => {
    lbDiv.innerHTML += `<p>${i + 1}. <strong>${name}</strong>: ${score}</p>`;
  });
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

// ---------------- GAME LOGIC ----------------

let grid = [];

function initGame() {
  grid = Array.from({ length: 4 }, () => Array(4).fill(0));
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
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault(); // جلوگیری از اسکرول
      move(e.key);
    }
  };

  // لمس برای موبایل
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

  grid.forEach((row) =>
    row.forEach((val) => {
      const tile = document.createElement("div");
      tile.className = `tile tile-${val}`;
      tile.setAttribute("data-value", val > 0 ? val : "");
      gameDiv.appendChild(tile);
    })
  );
}

function move(direction) {
  const clone = JSON.parse(JSON.stringify(grid));
  const combine = (row) => {
    let arr = row.filter(Boolean);
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        currentScore += arr[i];
        arr[i + 1] = 0;
      }
    }
    return arr.filter(Boolean).concat(Array(4 - arr.filter(Boolean).length).fill(0));
  };

  for (let i = 0; i < 4; i++) {
    let row;
    switch (direction) {
      case "ArrowLeft":
        grid[i] = combine(grid[i]);
        break;
      case "ArrowRight":
        row = grid[i].slice().reverse();
        grid[i] = combine(row).reverse();
        break;
      case "ArrowUp":
        row = grid.map(r => r[i]);
        const colUp = combine(row);
        grid.forEach((r, j) => (r[i] = colUp[j]));
        break;
      case "ArrowDown":
        row = grid.map(r => r[i]).reverse();
        const colDown = combine(row).reverse();
        grid.forEach((r, j) => (r[i] = colDown[j]));
        break;
    }
  }

  if (JSON.stringify(grid) !== JSON.stringify(clone)) {
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
