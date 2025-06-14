const CONTRACT_ADDRESS = "0xc08279d91abf58a454a5cea8f072b7817409e485";
const CONTRACT_ABI = [
  "function submitScore(string memory name, uint256 score) public",
  "function getTopScores() public view returns (tuple(address player, string name, uint256 score)[])"
];
