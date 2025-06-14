let board, score = 0;
const size = 4;
const BASE_CHAIN_ID = "0x2105";
const CONTRACT_ADDRESS = "0xc08279d91abf58a454a5cea8f072b7817409e485";
const CONTRACT_ABI = [
  "function gm() public",
  "function submitScore(uint256 score, string memory playerName) public",
  "function getTopScores() public view returns (tuple(address player, uint256 score, string name)[])"
];

window.onload = async () => {
  initGame();
  setupControls();
};

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
  if (empty.length === 0) return;
  const { r, c } = empty[Math.floor(Math.random() * empty.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function updateBoard() {
  const container = document.getElementById("game");
  container.innerHTML = "";
  board.forEach(row => row.forEach(val => {
    const tile = document.createElement("div");
    tile.className = `tile tile-${val}`;
    tile.dataset.value = val || "";
    container.appendChild(tile);
  }));
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
  while (newRow.length < size) newRow.push(0);
  return newRow;
}

function rotateClockwise(mat) {
  return mat[0].map((_, i) => mat.map(row => row[i]).reverse());
}

function rotateCounterClockwise(mat) {
  return mat[0].map((_, i) => mat.map(row => row[row.length - 1 - i]));
}

function rotate180(mat) {
  return mat.map(row => row.reverse()).reverse();
}

function setupControls() {
  document.onkeydown = (e) => {
    let oldBoard = JSON.stringify(board);
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
        return;
    }

    if (JSON.stringify(board) !== oldBoard) {
      addNumber();
      updateBoard();
      checkGameOver();
    }
  };

  document.getElementById("gmButton").addEventListener("click", async () => {
    if (!window.contract) return alert("⛔ اول ولت رو وصل کن");

    try {
      const network = await window.contract.runner.provider.getNetwork();
      if (network.chainId !== parseInt(BASE_CHAIN_ID, 16)) {
        return alert("🛑 لطفاً شبکه Base رو انتخاب کن");
      }

      const tx = await window.contract.gm();
      await tx.wait();
      alert("🌞 GM ثبت شد!");
    } catch (err) {
      alert("❌ خطا در GM: " + err.message);
    }
  });

  document.getElementById("scoreForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("playerName").value.trim();
    if (!name || score === 0) return alert("اسم یا امتیاز معتبر نیست");

    if (!window.contract) return alert("⛔ اول ولت رو وصل کن");

    try {
      const network = await window.contract.runner.provider.getNetwork();
      if (network.chainId !== parseInt(BASE_CHAIN_ID, 16)) {
        return alert("🛑 لطفاً شبکه Base رو انتخاب کن");
      }

      const tx = await window.contract.submitScore(score, name);
      await tx.wait();
      alert("✅ امتیاز ثبت شد!");
      document.getElementById("playerName").value = "";
      document.getElementById("scoreForm").style.display = "none";
      initGame();
    } catch (err) {
      alert("❌ ثبت امتیاز ناموفق بود: " + err.message);
    }
  });

  document.getElementById("leaderboardToggle").addEventListener("click", async () => {
    const boardElem = document.getElementById("leaderboard");
    if (boardElem.style.display === "none") {
      try {
        const scores = await window.contract.getTopScores();
        boardElem.innerHTML = "<h3>🏆 Leaderboard</h3><ul>" + scores.map((s, i) =>
          `<li>#${i + 1} - ${s.name || "(unknown)"}: ${s.score}</li>`
        ).join("") + "</ul>";
        boardElem.style.display = "block";
      } catch (err) {
        alert("❌ خطا در دریافت لیدربرد: " + err.message);
      }
    } else {
      boardElem.style.display = "none";
    }
  });
}

function checkGameOver() {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 0 ||
        (c < size - 1 && board[r][c] === board[r][c + 1]) ||
        (r < size - 1 && board[r][c] === board[r + 1][c])) return;
    }
  }
  showGameOver();
}

function showGameOver() {
  alert(`💀 Game Over!\n🏁 امتیاز: ${score}`);
  document.getElementById("scoreForm").style.display = "block";
}
