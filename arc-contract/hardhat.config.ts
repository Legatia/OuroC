import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";
import "solidity-coverage";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // Enable for better optimization
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      forking: process.env.FORK_URL
        ? {
            url: process.env.FORK_URL,
          }
        : undefined,
    },
    "arc-testnet": {
      url: process.env.ARC_TESTNET_RPC || "https://rpc.testnet.arc.network",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 0, // TODO: Update with actual Arc testnet chain ID
      gasPrice: "auto",
    },
    "arc-mainnet": {
      url: process.env.ARC_MAINNET_RPC || "https://rpc.mainnet.arc.network",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 0, // TODO: Update with actual Arc mainnet chain ID
      gasPrice: "auto",
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    token: "USDC", // Arc uses USDC for gas
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  etherscan: {
    apiKey: {
      "arc-testnet": process.env.ARC_EXPLORER_API_KEY || "",
      "arc-mainnet": process.env.ARC_EXPLORER_API_KEY || "",
    },
    customChains: [
      {
        network: "arc-testnet",
        chainId: 0, // TODO: Update
        urls: {
          apiURL: process.env.ARC_TESTNET_EXPLORER_API || "",
          browserURL: process.env.ARC_TESTNET_EXPLORER || "",
        },
      },
      {
        network: "arc-mainnet",
        chainId: 0, // TODO: Update
        urls: {
          apiURL: process.env.ARC_MAINNET_EXPLORER_API || "",
          browserURL: process.env.ARC_MAINNET_EXPLORER || "",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};

export default config;
