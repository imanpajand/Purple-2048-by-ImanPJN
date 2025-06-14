const BASE_CHAIN_ID = "0x2105"; // معادل 8453 به هگزادسیمال

const BASE_PARAMS = {
  chainId: BASE_CHAIN_ID,
  chainName: "Base Mainnet",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://base-mainnet.g.alchemy.com/v2/00eGcxP8BSNOMYfThP9H1"],
  blockExplorerUrls: ["https://basescan.org"],
};

async function connectWallet() {
  if (typeof window.ethereum === "undefined") {
    alert("لطفاً کیف‌پول Web3 مثل MetaMask یا Rabby نصب کنید.");
    return;
  }

  const provider = new ethers.BrowserProvider(window.ethereum);

  try {
    await provider.send("eth_requestAccounts", []);
    const network = await provider.getNetwork();

    if (network.chainId !== parseInt(BASE_CHAIN_ID, 16)) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: BASE_CHAIN_ID }],
        });
      } catch (switchError) {
        // اگر شبکه وجود نداشت، اضافه‌اش کن
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [BASE_PARAMS],
            });
          } catch (addError) {
            console.error("افزودن شبکه شکست خورد:", addError);
            return;
          }
        } else {
          console.error("سوئیچ شبکه شکست خورد:", switchError);
          return;
        }
      }
    }

    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    document.getElementById("connectWalletBtn").innerText = `🟢 ${shortenAddress(address)}`;
    document.getElementById("connectWalletBtn").disabled = true;

    window.signer = signer;
    window.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  } catch (err) {
    console.error("خطا در اتصال والت:", err);
  }
}

function shortenAddress(addr) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}
