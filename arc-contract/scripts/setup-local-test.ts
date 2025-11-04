import { ethers } from "hardhat";

/**
 * Setup script for local testing
 * Deploys mock USDC and OuroCPrimaArc contracts
 */
async function main() {
  console.log("🧪 Setting up local test environment...\n");

  const [deployer, icpSigner, merchant, subscriber] = await ethers.getSigners();

  console.log("Test accounts:");
  console.log("- Deployer:", deployer.address);
  console.log("- ICP Signer:", icpSigner.address);
  console.log("- Merchant:", merchant.address);
  console.log("- Subscriber:", subscriber.address);
  console.log("");

  // Deploy mock USDC
  console.log("Deploying mock USDC...");
  const MockERC20 = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✅ Mock USDC deployed to:", usdcAddress);

  // Mint USDC to test accounts
  const mintAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
  await usdc.mint(subscriber.address, mintAmount);
  console.log("Minted 10,000 USDC to subscriber");
  console.log("");

  // Deploy OuroCPrimaArc
  console.log("Deploying OuroCPrimaArc...");
  const OuroCPrimaArc = await ethers.getContractFactory("OuroCPrimaArc");
  const contract = await OuroCPrimaArc.deploy(
    usdcAddress,
    icpSigner.address,
    deployer.address // Fee collection
  );
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  console.log("✅ OuroCPrimaArc deployed to:", contractAddress);
  console.log("");

  // Approve USDC spending
  const approveAmount = ethers.parseUnits("1000", 6); // 1,000 USDC
  const usdcAsSubscriber = usdc.connect(subscriber);
  await usdcAsSubscriber.approve(contractAddress, approveAmount);
  console.log("✅ Subscriber approved 1,000 USDC spending");
  console.log("");

  // Summary
  console.log("📋 Local Test Environment Ready!");
  console.log("");
  console.log("Contract Addresses:");
  console.log("- USDC:", usdcAddress);
  console.log("- OuroCPrimaArc:", contractAddress);
  console.log("");
  console.log("Test Data:");
  console.log("- Subscriber USDC Balance:", ethers.formatUnits(await usdc.balanceOf(subscriber.address), 6));
  console.log("- Subscriber Allowance:", ethers.formatUnits(await usdc.allowance(subscriber.address, contractAddress), 6));
  console.log("");

  return {
    usdc: usdcAddress,
    contract: contractAddress,
    deployer: deployer.address,
    icpSigner: icpSigner.address,
    merchant: merchant.address,
    subscriber: subscriber.address,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
