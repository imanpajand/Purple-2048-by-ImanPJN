import { ethers } from "https://esm.sh/ethers@6.11.1";

const CONTRACT_ADDRESS = "0xc08279d91abf58a454a5cea8f072b7817409e485";
const ABI = [
  "function gm(string name, uint256 score) external",
  "event GM(string name, uint256 score, address player, uint256 timestamp)"
];
const ALCHEMY_RPC = "https://base-mainnet.g.alchemy.com/v2/00eGcxP8BSNOMYfThP9H1";

let provider, signer, contract, userAddress;

async function connectWallet() {
  try {
    let eth = null;

    if (window.sdk?.wallet?.getEthereumProvider) {
      eth = await window.sdk.wallet.getEthereumProvider();
      console.log("📱 Farcaster MiniApp Wallet Detected");
    } else if (window.ethereum?.isFrame) {
      eth = window.ethereum;
      console.log("🟣 Base App Frame Wallet Detected");
    } else if (window.ethereum?.providers?.length) {
      const injected = window.ethereum.providers.find(p => p.isMetaMask || p.isRabby);
      if (injected) {
        eth = injected;
        console.log("🦊 Rabby/MetaMask Multi-Provider Detected");
      }
    } else if (window.ethereum) {
      eth = window.ethereum;
      console.log("🌐 Generic Injected Wallet Detected");
    }

    if (!eth) {
      const { default: WalletConnectProvider } = await import("https://esm.sh/@walletconnect/ethereum-provider@2.11.1");
      const wcProvider = await WalletConnectProvider.init({
        projectId: "cbebd7551cdeac3057b0b88c0cf51f2a",
        chains: [8453],
        showQrModal: true,
      });
      await wcProvider.enable();
      eth = wcProvider;
    }

    provider = new ethers.BrowserProvider(eth);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    const baseChainId = "0x2105";
    const currentChain = await provider.send("eth_chainId", []);
    if (currentChain !== baseChainId) {
      try {
        await provider.send("wallet_switchEthereumChain", [{ chainId: baseChainId }]);
        console.log("🔄 Switched to Base Network");
      } catch (err) {
        console.warn("⚠️ Network switch failed:", err);
      }
    }

    document.getElementById("wallet-address").innerText = userAddress;
  } catch (err) {
    console.error("Error connecting wallet:", err);
  }
}

async function submitScore(name, score) {
  try {
    if (!contract || !signer) {
      alert("اول کیف پولتو وصل کن!");
      return;
    }

    const txOptions = {};
    if (window.sdk?.wallet?.getEthereumProvider || window.ethereum?.isFarcaster) {
      txOptions.gasLimit = 100000;
    }

    const tx = await contract.gm(name, score, txOptions);
    document.getElementById("status").innerText = "🟡 ثبت امتیاز در حال انجام...";
    await tx.wait();
    document.getElementById("status").innerText = "🟢 امتیاز با موفقیت ثبت شد!";
    loadLeaderboard();
  } catch (err) {
    console.error("Error submitting score:", err);
    document.getElementById("status").innerText = "⚠️ خطا در ثبت امتیاز.";
  }
}

async function loadLeaderboard() {
  try {
    const publicProvider = new ethers.JsonRpcProvider(ALCHEMY_RPC);
    const readContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, publicProvider);
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
    const list = document.getElementById("leaderboard");
    list.innerHTML = "";
    sorted.slice(0, 5).forEach(([name, score]) => {
      const li = document.createElement("li");
      li.textContent = `${name}: ${score}`;
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Error loading leaderboard:", err);
  }
}

function saveScoreLocally(name, score) {
  const scores = JSON.parse(localStorage.getItem("leaderboard") || "[]");
  scores.push({ name, score });
  localStorage.setItem("leaderboard", JSON.stringify(scores));
}

function setupControls() {
  document.getElementById("connect-button").onclick = connectWallet;
  document.getElementById("submit-button").onclick = async () => {
    const name = prompt("اسمتو وارد کن:") || "بی‌نام";
    const score = parseInt(document.getElementById("score").innerText);
    saveScoreLocally(name, score);
    await submitScore(name, score);
  };
}

function initGame() {
  let score = 0;
  const scoreDisplay = document.getElementById("score");

  document.getElementById("increment-button").onclick = () => {
    score += 2;
    scoreDisplay.innerText = score;
  };

  loadLeaderboard();
  setupControls();
}

window.onload = initGame;
