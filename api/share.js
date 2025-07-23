
export default function handler(req, res) {
  const text = encodeURIComponent(
    "Play fun and addictive #2048 game on Base and save your score on-chain on top the leaderboard! 🔵 🎮\nPurple 2048 #MiniApp by @imaan 💜 \nhttps://purple2048.vercel.app"
  );
  const url = `https://farcaster.xyz/~/compose?text=${text}`;
  res.writeHead(302, { Location: url });
  res.end();
}
