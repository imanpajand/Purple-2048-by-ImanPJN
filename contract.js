// Connnect SC
const contractAddress = "0xc08279d91abf58a454a5cea8f072b7817409e485"; 
const contractABI = [
  "function gm() public",
  "function submitScore(uint256 score, string memory playerName) public",
  "function getTopScores() public view returns (tuple(address player, uint256 score, string name)[])"
];

let signer, contract;

// Wallet
document.getElementById("connectWallet").addEventListener("click", async () => {
  if (typeof window.ethereum !== "undefined") {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      signer = await provider.getSigner();
      contract = new ethers.Contract(contractAddress, contractABI, signer);
      alert("✅ Wallet connected");
    } catch (error) {
      alert("❌ Error connecting wallet: " + error.message);
    }
  } else {
    alert("MetaMask یا Rabby نصب نیست!");
  }
});

//GM
document.getElementById("gmButton").addEventListener("click", async () => {
  if (!contract) return alert("⛔️ اول ولت رو وصل کن");
  try {
    const tx = await contract.gm();
    await tx.wait();
    alert("🌞 GM sent!");
  } catch (err) {
    alert("⛔ GM failed: " + err.message);
  }
});


document.getElementById("scoreForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!contract) return alert("⛔️ اول ولت رو وصل کن");

  const name = document.getElementById("playerName").value.trim();
  const score = window.score;

  if (!name || score === 0) return alert("اسم یا امتیاز معتبر نیست");

  try {
    const tx = await contract.submitScore(score, name);
    await tx.wait();
    alert("✅ امتیاز ثبت شد!");
    document.getElementById("playerName").value = "";
  } catch (err) {
    alert("❌ ثبت امتیاز ناموفق بود: " + err.message);
  }
});


document.getElementById("leaderboardToggle").addEventListener("click", async () => {
  if (!contract) return alert("⛔️ اول ولت رو وصل کن");

  const board = document.getElementById("leaderboard");
  if (board.style.display === "none") {
    try {
      const topScores = await contract.getTopScores();
      board.innerHTML = "<h3>🏆 Leaderboard</h3><ul>" + topScores.map((entry, i) =>
        `<li>#${i + 1} - ${entry.name || "(unknown)"}: ${entry.score}</li>`
      ).join("") + "</ul>";
      board.style.display = "block";
    } catch (err) {
      alert("❌ نمایش لیدربرد ناموفق بود: " + err.message);
    }
  } else {
    board.style.display = "none";
  }
});
