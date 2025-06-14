import { ethers } from "./ethers-6.14.3.umd.min.js";

let provider, signer, contract;
let currentScore = 0;

const CONTRACT_ADDRESS = "0xc08279d91abf58a454a5cea8f072b7817409e485";
const ABI = [
  "function gm(string name, uint256 score) external",
  "event GM(string name, uint256 score, address player, uint256 timestamp)"
];

window.onload = () => {
  disableScrollOnDesktop();
  document.getElementById("connectButton").onclick = connectWallet;
  document.getElementById("gmButton").onclick = sendGM;
  document.getElementById("scoreForm").onsubmit = submitScore;
};

function disableScrollOnDesktop() {
  if (window.innerWidth > 768) {
    document.body.style.overflow = "hidden";
    window.addEventListener("wheel", e => e.preventDefault(), { passive: false });
    window.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
  }
}

async function connectWallet() {
  try {
    if (!window.ethereum) throw new Error("والت پیدا نشد!");

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();

    // سوییچ به Base
    await provider.send("wallet_switchEthereumChain", [{ chainId: "0x2105" }]);

    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    document.getElementById("connectButton").innerText = "Wallet Connected";
  } catch (err) {
    console.error("Wallet Connect Error:", err);
    alert("❌ اتصال به کیف پول با خطا مواجه شد.");
  }
}

async function sendGM() {
  if (!contract) return alert("اول کیف پولتو وصل کن!");

  try {
    const tx = await contract.gm("Gm to Iman", 0);
    await tx.wait();
    alert("✅ GM ثبت شد!");
  } catch (err) {
    console.error("GM Error:", err);
    alert("❌ ارسال GM با خطا مواجه شد.");
  }
}

async function submitScore(e) {
  e.preventDefault();
  if (!contract) return alert("اول کیف پولتو وصل کن!");

  const name = document.getElementById("playerName").value.trim();
  if (!name) return alert("نام خودت رو وارد کن");

  try {
    const tx = await contract.gm(name, currentScore);
    await tx.wait();
    alert("✅ امتیازت ثبت شد!");
    document.getElementById("playerName").value = "";
    resetGame();
  } catch (err) {
    console.error("Submit Error:", err);
    alert("❌ ثبت امتیاز با خطا مواجه شد.");
  }
}

// فرضی: تابعی که امتیاز بازی رو آپدیت می‌کنه
function updateScore(score) {
  currentScore = score;
}

// فرضی: ریست کردن بازی
function resetGame() {
  currentScore = 0;
  // کدهای مربوط به ریست بقیه وضعیت بازی
}
