import hre from "hardhat";

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Account:", signer.address);

  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "BNB");

  // Get token contract
  const tokenAddress = process.env.TOKEN_ADDRESS;
  if (!tokenAddress) {
    console.error("TOKEN_ADDRESS not set in .env");
    process.exit(1);
  }

  const Token = await hre.ethers.getContractAt("MockERC20", tokenAddress);

  // Mint tokens
  const recipient = process.argv[2] || signer.address;
  const amount = process.argv[3] || "1000";

  console.log(`\nMinting ${amount} tokens to ${recipient}...`);

  const tx = await Token.mint(recipient, hre.ethers.parseUnits(amount, 18));
  console.log("Transaction hash:", tx.hash);

  await tx.wait();
  console.log("✓ Tokens minted successfully!");

  // Check balance
  const tokenBalance = await Token.balanceOf(recipient);
  console.log("New token balance:", hre.ethers.formatUnits(tokenBalance, 18));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
