// ===================================
//  ۱. متغیرهای اصلی و تنظیمات قرارداد
// ===================================
let board, score = 0;
const size = 4;
const BASE_CHAIN_ID = "0x2105"; // Hex for 8453 (Base Mainnet)
const CONTRACT_ADDRESS = "0xc08279d91abf58a454a5cea8f072b7817409e485";
const CONTRACT_ABI = [
  "function gm() public",
  "function submitScore(uint256 score, string memory playerName) public",
  "function getTopScores() public view returns (tuple(address player, uint256 score, string name)[])"
];

// متغیرهای سراسری برای والت
window.signer = null;
window.contract = null;

// ========================================
//  ۲. منطق مربوط به والت و بلاکچین
// ========================================

const BASE_PARAMS = {
  chainId: BASE_CHAIN_ID,
  chainName: "Base Mainnet",
  nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://mainnet.base.org"],
  blockExplorerUrls: ["https://basescan.org"],
};

async function connectWallet() {
  if (typeof window.ethereum === "undefined") {
    return alert("لطفاً کیف‌پول Web3 مثل MetaMask یا Rabby نصب کنید.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);

  try {
    // درخواست اتصال به والت
    await provider.send("eth_requestAccounts", []);
    const network = await provider.getNetwork();

    // بررسی و سوئیچ به شبکه Base
    if (network.chainId !== parseInt(BASE_CHAIN_ID, 16)) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: BASE_CHAIN_ID }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) { // اگر شبکه در والت تعریف نشده بود
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [BASE_PARAMS],
          });
        } else {
          throw switchError;
        }
      }
    }
    
    // بعد از اطمینان از اتصال و شبکه صحیح
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    
    // به‌روزرسانی UI
    document.getElementById("connectWalletBtn").innerText = `🟢 ${address.slice(0, 6)}...${address.slice(-4)}`;
    document.getElementById("connectWalletBtn").disabled = true;

    // ذخیره signer و contract در آبجکت window برای دسترسی سراسری
    window.signer = signer;
    window.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  } catch (err) {
    console.error("خطا در اتصال والت:", err);
    alert("اتصال به والت با مشکل مواجه شد. لطفاً دوباره تلاش کنید.");
  }
}

// ========================================
//  ۳. منطق اصلی بازی 2048
// ========================================

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
      if (board[r][c] === 0) return false; // هنوز جای خالی هست
      if (r < size - 1 && board[r][c] === board[r + 1][c]) return false; // حرکت عمودی ممکن است
      if (c < size - 1 && board[r][c] === board[r][c + 1]) return false; // حرکت افقی ممکن است
    }
  }
  return true; // هیچ حرکتی ممکن نیست
}

function showGameOver() {
  alert(`💀 Game Over!\n🏁 امتیاز نهایی: ${score}`);
  document.getElementById("scoreForm").style.display = "block";
}

// ========================================
//  ۴. کنترلرها و مدیریت رویدادها (Events)
// ========================================

function setupEventListeners() {
  // حرکت‌های بازی
  document.onkeydown = (e) => {
    let oldBoard = JSON.stringify(board);
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

    if (played && JSON.stringify(board) !== oldBoard) {
      addNumber();
      updateBoard();
      if (checkGameOver()) {
        showGameOver();
      }
    }
  };

  // دکمه GM
  document.getElementById("gmButton").addEventListener("click", async () => {
    if (!window.contract) return alert("⛔️ اول ولت رو وصل کن");
    try {
      const tx = await window.contract.gm();
      await tx.wait();
      alert("🌞 GM با موفقیت ثبت شد!");
    } catch (err) {
      alert("⛔ ارسال GM ناموفق بود: " + (err.reason || err.message));
    }
  });

  // ثبت امتیاز
  document.getElementById("scoreForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!window.contract) return alert("⛔️ اول ولت رو وصل کن");

    const name = document.getElementById("playerName").value.trim();
    if (!name || score === 0) return alert("اسم یا امتیاز معتبر نیست");

    try {
      const tx = await window.contract.submitScore(score, name);
      await tx.wait();
      alert("✅ امتیاز شما با موفقیت در بلاکچین ثبت شد!");
      // شروع مجدد بازی بعد از ثبت امتیاز
      initGame();
    } catch (err) {
      alert("❌ ثبت امتیاز ناموفق بود: " + (err.reason || err.message));
    }
  });

  // نمایش لیدربرد
  document.getElementById("leaderboardToggle").addEventListener("click", async () => {
    if (!window.contract) return alert("⛔️ اول ولت رو وصل کن");
    
    const boardEl = document.getElementById("leaderboard");
    if (boardEl.style.display === "none") {
      try {
        const scores = await window.contract.getTopScores();
        boardEl.innerHTML = "<h3>🏆 Leaderboard</h3><ul>" + scores.map((s, i) =>
          `<li>#${i + 1} - ${s.name || "(unknown)"}: ${s.score}</li>`
        ).join("") + "</ul>";
        boardEl.style.display = "block";
      } catch (err) {
        alert("❌ خطا در دریافت لیدربرد: " + (err.reason || err.message));
      }
    } else {
      boardEl.style.display = "none";
    }
  });
}

// ========================================
//  ۵. نقطه شروع برنامه
// ========================================
window.onload = () => {
  initGame();
  setupEventListeners();
};