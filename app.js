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
  initGame();
  setupControls();

  document.getElementById("scoreForm").addEventListener("submit", submitScore);
  document.getElementById("gmButton").addEventListener("click", sendGM);
  document.getElementById("leaderboardToggle").addEventListener("click", toggleLeaderboard);
  document.getElementById("connectWalletBtn").addEventListener("click", connectWallet);

  try {
    if (window.sdk?.actions?.ready) {
      await window.sdk.actions.ready();
      console.log("✅ sdk.actions.ready() called");
    }
  } catch (err) {
    console.error("❌ sdk ready error:", err);
  }

  if (window.ethereum || window.sdk?.wallet?.getEthereumProvider) {
    await connectWallet();
  }
};

async function connectWallet() {
  try {
    let eth = null;

    if (window.ethereum && window.ethereum.isFrame) {
      eth = window.ethereum;
      console.log("🟣 Base App Frame Wallet Detected");
    } else if (window.ethereum?.providers?.length) {
      const injected = window.ethereum.providers.find(p => p.isMetaMask || p.isRabby || p.isPhantom);
      if (injected) {
        eth = injected;
        console.log("🌐 Fallback to first injected provider");
      }
    } else if (window.ethereum) {
      eth = window.ethereum;
      console.log("🦊 MetaMask or Rabby Wallet Detected");
    } else if (window.sdk?.wallet?.getEthereumProvider) {
      try {
        eth = await window.sdk.wallet.getEthereumProvider();
        console.log("📱 Farcaster MiniApp Wallet Detected");
      } catch (err) {
        console.warn("⚠️ Farcaster provider error:", err);
      }
    }

    if (!eth && window.ethereum) {
      eth = window.ethereum;
      console.log("🌐 Fallback to generic injected wallet");
    }

    if (!eth) throw new Error("❌ هیچ کیف پولی پیدا نشد");

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
    const tx = await contract.gm("Gm to Iman", 0, { gasLimit: 100000 });
    await tx.wait();
    alert("✅GM به خودت عزیزم");
    await new Promise(res => setTimeout(res, 2000));
    loadLeaderboard();
  } catch (err) {
    console.error("GM Error:", err);
    alert("✅GM به خودت عزیزم");
    await new Promise(res => setTimeout(res, 2000));
    loadLeaderboard();
  }
}

async function submitScore(e) {
  e.preventDefault();
  if (!contract) return alert("اول کیف پول رو وصل کن");
  const name = document.getElementById("playerName").value.trim();
  if (!name) return alert("نام بازیکن وارد کن");
  try {
    const tx = await contract.gm(name, currentScore, { gasLimit: 100000 });
    await tx.wait();
    alert("🎯 امتیازت ثبت شد!");
    document.getElementById("playerName").value = "";
    loadLeaderboard();
    resetGame();
  } catch (err) {
    console.error("Submit Error:", err);
    alert("🎯 امتیازت ثبت شد!");
    document.getElementById("playerName").value = "";
    loadLeaderboard();
    resetGame();
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
let tilePositions = {}; // New object to store tile positions for animation

function initGame() {
  grid = Array.from({ length: 4 }, () => Array(4).fill(0));
  tilePositions = {};
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

  const gameBoard = document.getElementById("game");
  let startX, startY;
  const touchOptions = { passive: false };

  gameBoard.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, touchOptions);

  gameBoard.addEventListener("touchmove", (e) => {
    e.preventDefault();
  }, touchOptions);

  gameBoard.addEventListener("touchend", (e) => {
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
  const value = Math.random() < 0.9 ? 2 : 4;
  grid[r][c] = value;
  // Store the position of the new tile
  if (!tilePositions[`${r}-${c}`]) {
    tilePositions[`${r}-${c}`] = { value: value, r: r, c: c, isNew: true };
  } else {
    tilePositions[`${r}-${c}`].value = value;
    tilePositions[`${r}-${c}`].isNew = true;
  }
}

function updateGameBoard() {
  const gameDiv = document.getElementById("game");
  // First, clear old tiles but keep them in memory for animation
  const existingTiles = Array.from(gameDiv.children);

  // Generate new tiles and set up animations
  const newTilesHTML = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const val = grid[r][c];
      const tileValue = val > 0 ? val : "";
      const tile = document.createElement("div");
      tile.className = `tile tile-${val}`;
      tile.setAttribute("data-value", tileValue);
      // Set initial position for new tiles to animate from
      tile.style.transform = `translate(${c * 100}%, ${r * 100}%)`;
      if (val > 0) {
        tile.innerText = tileValue;
      }
      newTilesHTML.push(tile.outerHTML);
    }
  }

  // A small delay to ensure the DOM is updated before we start animations
  setTimeout(() => {
    gameDiv.innerHTML = newTilesHTML.join("");
    // Re-apply classes for animation after they are in the DOM
    const tiles = Array.from(gameDiv.children);
    let index = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const val = grid[r][c];
        const prevTile = tilePositions[`${r}-${c}`];
        const currentTile = tiles[index];

        if (val > 0) {
          if (prevTile && prevTile.isMerged) {
            currentTile.classList.add('merge');
          } else if (prevTile && prevTile.isNew) {
            currentTile.classList.add('new-tile');
          }
        }
        index++;
      }
    }
  }, 0);
}


function move(direction) {
  const prevGrid = JSON.parse(JSON.stringify(grid));
  let moved = false;
  let scoreIncrease = 0;

  const combine = (row) => {
    let arr = row.filter(Boolean);
    let merged = Array(arr.length).fill(false);
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        scoreIncrease += arr[i];
        arr[i + 1] = 0;
        merged[i] = true;
      }
    }
    const newArr = arr.filter(Boolean);
    const result = newArr.concat(Array(4 - newArr.length).fill(0));
    return { result, merged };
  };

  const getPos = (i, j, direction) => {
    if (direction === "ArrowLeft") return { r: i, c: j };
    if (direction === "ArrowRight") return { r: i, c: 3 - j };
    if (direction === "ArrowUp") return { r: j, c: i };
    if (direction === "ArrowDown") return { r: 3 - j, c: i };
    return { r: i, c: j };
  };

  const getPreviousPositions = () => {
    const prevPositions = {};
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (prevGrid[r][c] > 0) {
          prevPositions[`${r}-${c}`] = prevGrid[r][c];
        }
      }
    }
    return prevPositions;
  };

  const prevPositions = getPreviousPositions();
  const newTilePositions = {};

  for (let i = 0; i < 4; i++) {
    let row;
    switch (direction) {
      case "ArrowLeft":
        row = grid[i];
        break;
      case "ArrowRight":
        row = grid[i].slice().reverse();
        break;
      case "ArrowUp":
        row = grid.map(r => r[i]);
        break;
      case "ArrowDown":
        row = grid.map(r => r[i]).reverse();
        break;
    }

    const oldRow = JSON.stringify(row);
    const { result, merged } = combine(row);

    if (JSON.stringify(result) !== oldRow) {
      moved = true;
    }

    // Update grid and store tile information for animation
    for (let j = 0; j < 4; j++) {
      const { r, c } = getPos(i, j, direction);
      grid[r][c] = result[j];
      if (result[j] > 0) {
        newTilePositions[`${r}-${c}`] = {
          value: result[j],
          r,
          c,
          isNew: false,
          isMerged: merged[j]
        };
      }
    }
  }

  if (moved) {
    currentScore += scoreIncrease;
    tilePositions = newTilePositions;
    addRandomTile();
    updateGameBoard();
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
