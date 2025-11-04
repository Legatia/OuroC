import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Deploy OuroCPrimaArc contract to Arc testnet
 */
async function main() {
  console.log("🚀 Deploying OuroCPrimaArc to Arc testnet...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatUnits(balance, 6), "USDC\n");

  // Contract parameters
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x"; // TODO: Update with Arc testnet USDC
  const ICP_SIGNER_ADDRESS = process.env.ICP_SIGNER_PUBLIC_KEY || "0x"; // TODO: Derive from ICP canister
  const FEE_COLLECTION_ADDRESS = deployer.address; // TODO: Update with ICP canister's Arc wallet

  console.log("Deployment parameters:");
  console.log("- USDC Address:", USDC_ADDRESS);
  console.log("- ICP Signer:", ICP_SIGNER_ADDRESS);
  console.log("- Fee Collection:", FEE_COLLECTION_ADDRESS);
  console.log("");

  // Validate addresses
  if (USDC_ADDRESS === "0x" || !ethers.isAddress(USDC_ADDRESS)) {
    throw new Error("Invalid USDC address. Set USDC_ADDRESS in .env");
  }
  if (ICP_SIGNER_ADDRESS === "0x" || !ethers.isAddress(ICP_SIGNER_ADDRESS)) {
    throw new Error("Invalid ICP signer address. Set ICP_SIGNER_PUBLIC_KEY in .env");
  }

  // Deploy contract
  console.log("Deploying OuroCPrimaArc contract...");
  const OuroCPrimaArc = await ethers.getContractFactory("OuroCPrimaArc");
  const contract = await OuroCPrimaArc.deploy(
    USDC_ADDRESS,
    ICP_SIGNER_ADDRESS,
    FEE_COLLECTION_ADDRESS
  );

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("✅ OuroCPrimaArc deployed to:", contractAddress);
  console.log("");

  // Verify deployment
  console.log("Verifying deployment...");
  const usdc = await contract.usdc();
  const icpSigner = await contract.icpSignerAddress();
  const feeAddress = await contract.feeCollectionAddress();
  const feeConfig = await contract.feeConfig();

  console.log("Contract state:");
  console.log("- USDC:", usdc);
  console.log("- ICP Signer:", icpSigner);
  console.log("- Fee Collection:", feeAddress);
  console.log("- Fee Percentage:", feeConfig.feePercentageBasisPoints, "basis points (", feeConfig.feePercentageBasisPoints / 100, "%)");
  console.log("- Min Fee:", ethers.formatUnits(feeConfig.minFeeAmount, 6), "USDC");
  console.log("");

  // Save deployment info
  const deploymentInfo = {
    network: "arc-testnet",
    contractAddress: contractAddress,
    deployer: deployer.address,
    usdc: USDC_ADDRESS,
    icpSigner: ICP_SIGNER_ADDRESS,
    feeCollection: FEE_COLLECTION_ADDRESS,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
  };

  console.log("📝 Deployment Info:", JSON.stringify(deploymentInfo, null, 2));
  console.log("");

  // Next steps
  console.log("🎯 Next Steps:");
  console.log("1. Update .env with:");
  console.log(`   OUROC_PRIMA_ARC_ADDRESS=${contractAddress}`);
  console.log("");
  console.log("2. Update ICP Timer Canister with contract address");
  console.log("");
  console.log("3. Update frontend with Arc network configuration:");
  console.log("   - Chain ID: (check Arc docs)");
  console.log("   - RPC URL:", process.env.ARC_TESTNET_RPC);
  console.log("   - Contract:", contractAddress);
  console.log("");
  console.log("4. Verify contract on Arc explorer:");
  console.log(`   npx hardhat verify --network arc-testnet ${contractAddress} ${USDC_ADDRESS} ${ICP_SIGNER_ADDRESS} ${FEE_COLLECTION_ADDRESS}`);
  console.log("");
  console.log("5. Test subscription creation from frontend");
  console.log("");

  return deploymentInfo;
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
