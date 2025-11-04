import { expect } from "chai";
import { ethers } from "hardhat";
import { OuroCPrimaArc, MockUSDC } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("OuroCPrimaArc", function () {
  let usdc: MockUSDC;
  let contract: OuroCPrimaArc;
  let deployer: SignerWithAddress;
  let icpSigner: SignerWithAddress;
  let merchant: SignerWithAddress;
  let subscriber: SignerWithAddress;
  let feeCollector: SignerWithAddress;

  const SUBSCRIPTION_AMOUNT = ethers.parseUnits("15.99", 6); // $15.99
  const INTERVAL_SECONDS = 30 * 24 * 60 * 60; // 30 days
  const MINT_AMOUNT = ethers.parseUnits("10000", 6); // 10,000 USDC

  beforeEach(async function () {
    // Get signers
    [deployer, icpSigner, merchant, subscriber, feeCollector] = await ethers.getSigners();

    // Deploy mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();

    // Deploy OuroCPrimaArc
    const OuroCPrimaArc = await ethers.getContractFactory("OuroCPrimaArc");
    contract = await OuroCPrimaArc.deploy(
      await usdc.getAddress(),
      icpSigner.address,
      feeCollector.address
    );
    await contract.waitForDeployment();

    // Mint USDC to subscriber
    await usdc.mint(subscriber.address, MINT_AMOUNT);

    // Approve contract to spend USDC
    await usdc.connect(subscriber).approve(
      await contract.getAddress(),
      ethers.parseUnits("1000", 6)
    );
  });

  describe("Deployment", function () {
    it("Should set the correct USDC address", async function () {
      expect(await contract.usdc()).to.equal(await usdc.getAddress());
    });

    it("Should set the correct ICP signer", async function () {
      expect(await contract.icpSignerAddress()).to.equal(icpSigner.address);
    });

    it("Should set the correct fee collector", async function () {
      expect(await contract.feeCollectionAddress()).to.equal(feeCollector.address);
    });

    it("Should set default fee config (2%)", async function () {
      const feeConfig = await contract.feeConfig();
      expect(feeConfig.feePercentageBasisPoints).to.equal(200); // 2%
      expect(feeConfig.minFeeAmount).to.equal(0);
    });

    it("Should set deployer as owner", async function () {
      expect(await contract.owner()).to.equal(deployer.address);
    });
  });

  describe("Subscription Creation", function () {
    it("Should create a subscription with valid ICP signature", async function () {
      const subscriptionId = ethers.id("test-subscription-1");
      const nonce = ethers.randomBytes(32);

      // Create signature
      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["string", "bytes32", "address", "address", "uint256", "uint256", "bytes32"],
          [
            "CREATE_SUBSCRIPTION",
            subscriptionId,
            subscriber.address,
            merchant.address,
            SUBSCRIPTION_AMOUNT,
            INTERVAL_SECONDS,
            nonce,
          ]
        )
      );

      const signature = await icpSigner.signMessage(ethers.getBytes(messageHash));

      // Create subscription
      await expect(
        contract.connect(subscriber).createSubscription(
          subscriptionId,
          merchant.address,
          "Netflix Premium",
          SUBSCRIPTION_AMOUNT,
          INTERVAL_SECONDS,
          1, // Reminder 1 day before
          signature,
          nonce
        )
      )
        .to.emit(contract, "SubscriptionCreated")
        .withArgs(
          subscriptionId,
          subscriber.address,
          merchant.address,
          SUBSCRIPTION_AMOUNT,
          INTERVAL_SECONDS
        );

      // Verify subscription details
      const sub = await contract.getSubscription(subscriptionId);
      expect(sub.subscriber).to.equal(subscriber.address);
      expect(sub.merchant).to.equal(merchant.address);
      expect(sub.merchantName).to.equal("Netflix Premium");
      expect(sub.amount).to.equal(SUBSCRIPTION_AMOUNT);
      expect(sub.intervalSeconds).to.equal(INTERVAL_SECONDS);
      expect(sub.status).to.equal(0); // Active
      expect(sub.paymentsMade).to.equal(0);
    });

    it("Should reject invalid signature", async function () {
      const subscriptionId = ethers.id("test-subscription-2");
      const nonce = ethers.randomBytes(32);

      // Create signature with wrong signer
      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["string", "bytes32", "address", "address", "uint256", "uint256", "bytes32"],
          [
            "CREATE_SUBSCRIPTION",
            subscriptionId,
            subscriber.address,
            merchant.address,
            SUBSCRIPTION_AMOUNT,
            INTERVAL_SECONDS,
            nonce,
          ]
        )
      );

      const signature = await deployer.signMessage(ethers.getBytes(messageHash)); // Wrong signer

      await expect(
        contract.connect(subscriber).createSubscription(
          subscriptionId,
          merchant.address,
          "Netflix Premium",
          SUBSCRIPTION_AMOUNT,
          INTERVAL_SECONDS,
          1,
          signature,
          nonce
        )
      ).to.be.revertedWithCustomError(contract, "InvalidSignature");
    });

    it("Should reject duplicate nonce", async function () {
      const subscriptionId = ethers.id("test-subscription-3");
      const nonce = ethers.randomBytes(32);

      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["string", "bytes32", "address", "address", "uint256", "uint256", "bytes32"],
          [
            "CREATE_SUBSCRIPTION",
            subscriptionId,
            subscriber.address,
            merchant.address,
            SUBSCRIPTION_AMOUNT,
            INTERVAL_SECONDS,
            nonce,
          ]
        )
      );

      const signature = await icpSigner.signMessage(ethers.getBytes(messageHash));

      // First creation succeeds
      await contract.connect(subscriber).createSubscription(
        subscriptionId,
        merchant.address,
        "Netflix Premium",
        SUBSCRIPTION_AMOUNT,
        INTERVAL_SECONDS,
        1,
        signature,
        nonce
      );

      // Second creation with same nonce fails
      const subscriptionId2 = ethers.id("test-subscription-4");
      const messageHash2 = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["string", "bytes32", "address", "address", "uint256", "uint256", "bytes32"],
          [
            "CREATE_SUBSCRIPTION",
            subscriptionId2,
            subscriber.address,
            merchant.address,
            SUBSCRIPTION_AMOUNT,
            INTERVAL_SECONDS,
            nonce, // Same nonce
          ]
        )
      );

      const signature2 = await icpSigner.signMessage(ethers.getBytes(messageHash2));

      await expect(
        contract.connect(subscriber).createSubscription(
          subscriptionId2,
          merchant.address,
          "Spotify",
          SUBSCRIPTION_AMOUNT,
          INTERVAL_SECONDS,
          1,
          signature2,
          nonce
        )
      ).to.be.revertedWithCustomError(contract, "NonceAlreadyUsed");
    });

    it("Should reject insufficient allowance", async function () {
      const subscriptionId = ethers.id("test-subscription-5");
      const nonce = ethers.randomBytes(32);

      // Revoke approval
      await usdc.connect(subscriber).approve(await contract.getAddress(), 0);

      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["string", "bytes32", "address", "address", "uint256", "uint256", "bytes32"],
          [
            "CREATE_SUBSCRIPTION",
            subscriptionId,
            subscriber.address,
            merchant.address,
            SUBSCRIPTION_AMOUNT,
            INTERVAL_SECONDS,
            nonce,
          ]
        )
      );

      const signature = await icpSigner.signMessage(ethers.getBytes(messageHash));

      await expect(
        contract.connect(subscriber).createSubscription(
          subscriptionId,
          merchant.address,
          "Netflix Premium",
          SUBSCRIPTION_AMOUNT,
          INTERVAL_SECONDS,
          1,
          signature,
          nonce
        )
      ).to.be.revertedWithCustomError(contract, "InsufficientAllowance");
    });
  });

  describe("Payment Processing", function () {
    let subscriptionId: string;

    beforeEach(async function () {
      // Create a subscription first
      subscriptionId = ethers.id("test-payment-sub");
      const nonce = ethers.randomBytes(32);

      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["string", "bytes32", "address", "address", "uint256", "uint256", "bytes32"],
          [
            "CREATE_SUBSCRIPTION",
            subscriptionId,
            subscriber.address,
            merchant.address,
            SUBSCRIPTION_AMOUNT,
            INTERVAL_SECONDS,
            nonce,
          ]
        )
      );

      const signature = await icpSigner.signMessage(ethers.getBytes(messageHash));

      await contract.connect(subscriber).createSubscription(
        subscriptionId,
        merchant.address,
        "Test Service",
        SUBSCRIPTION_AMOUNT,
        INTERVAL_SECONDS,
        1,
        signature,
        nonce
      );
    });

    it("Should process payment with valid ICP signature", async function () {
      // Fast forward time to payment time
      const sub = await contract.getSubscription(subscriptionId);
      await time.increaseTo(sub.nextPaymentTime);

      const nonce = ethers.randomBytes(32);
      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["string", "bytes32", "uint256", "uint256", "bytes32"],
          [
            "PROCESS_PAYMENT",
            subscriptionId,
            sub.nextPaymentTime,
            sub.amount,
            nonce,
          ]
        )
      );

      const signature = await icpSigner.signMessage(ethers.getBytes(messageHash));

      // Get balances before
      const merchantBalanceBefore = await usdc.balanceOf(merchant.address);
      const feeCollectorBalanceBefore = await usdc.balanceOf(feeCollector.address);

      // Process payment
      await expect(
        contract.processTrigger(subscriptionId, signature, nonce)
      ).to.emit(contract, "PaymentProcessed");

      // Verify balances after
      const feeAmount = (SUBSCRIPTION_AMOUNT * 200n) / 10000n; // 2%
      const merchantAmount = SUBSCRIPTION_AMOUNT - feeAmount;

      expect(await usdc.balanceOf(merchant.address)).to.equal(
        merchantBalanceBefore + merchantAmount
      );
      expect(await usdc.balanceOf(feeCollector.address)).to.equal(
        feeCollectorBalanceBefore + feeAmount
      );

      // Verify subscription updated
      const subAfter = await contract.getSubscription(subscriptionId);
      expect(subAfter.paymentsMade).to.equal(1);
      expect(subAfter.totalPaid).to.equal(SUBSCRIPTION_AMOUNT);
      expect(subAfter.consecutiveFailures).to.equal(0);
    });

    it("Should reject payment before next payment time", async function () {
      const nonce = ethers.randomBytes(32);
      const sub = await contract.getSubscription(subscriptionId);

      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["string", "bytes32", "uint256", "uint256", "bytes32"],
          [
            "PROCESS_PAYMENT",
            subscriptionId,
            sub.nextPaymentTime,
            sub.amount,
            nonce,
          ]
        )
      );

      const signature = await icpSigner.signMessage(ethers.getBytes(messageHash));

      await expect(
        contract.processTrigger(subscriptionId, signature, nonce)
      ).to.be.revertedWithCustomError(contract, "PaymentTooEarly");
    });

    it("Should handle insufficient balance gracefully", async function () {
      // Burn all subscriber's USDC
      const balance = await usdc.balanceOf(subscriber.address);
      await usdc.burn(subscriber.address, balance);

      // Fast forward time
      const sub = await contract.getSubscription(subscriptionId);
      await time.increaseTo(sub.nextPaymentTime);

      const nonce = ethers.randomBytes(32);
      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["string", "bytes32", "uint256", "uint256", "bytes32"],
          [
            "PROCESS_PAYMENT",
            subscriptionId,
            sub.nextPaymentTime,
            sub.amount,
            nonce,
          ]
        )
      );

      const signature = await icpSigner.signMessage(ethers.getBytes(messageHash));

      // Should emit PaymentFailed event
      await expect(
        contract.processTrigger(subscriptionId, signature, nonce)
      ).to.emit(contract, "PaymentFailed");

      // Verify consecutive failures incremented
      const subAfter = await contract.getSubscription(subscriptionId);
      expect(subAfter.consecutiveFailures).to.equal(1);
    });
  });

  describe("Subscription Management", function () {
    let subscriptionId: string;

    beforeEach(async function () {
      subscriptionId = ethers.id("test-mgmt-sub");
      const nonce = ethers.randomBytes(32);

      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["string", "bytes32", "address", "address", "uint256", "uint256", "bytes32"],
          [
            "CREATE_SUBSCRIPTION",
            subscriptionId,
            subscriber.address,
            merchant.address,
            SUBSCRIPTION_AMOUNT,
            INTERVAL_SECONDS,
            nonce,
          ]
        )
      );

      const signature = await icpSigner.signMessage(ethers.getBytes(messageHash));

      await contract.connect(subscriber).createSubscription(
        subscriptionId,
        merchant.address,
        "Test Service",
        SUBSCRIPTION_AMOUNT,
        INTERVAL_SECONDS,
        1,
        signature,
        nonce
      );
    });

    it("Should allow subscriber to pause subscription", async function () {
      await expect(contract.connect(subscriber).pauseSubscription(subscriptionId))
        .to.emit(contract, "SubscriptionStatusChanged")
        .withArgs(subscriptionId, 0, 1); // Active -> Paused

      const sub = await contract.getSubscription(subscriptionId);
      expect(sub.status).to.equal(1); // Paused
    });

    it("Should allow subscriber to resume subscription", async function () {
      await contract.connect(subscriber).pauseSubscription(subscriptionId);

      await expect(contract.connect(subscriber).resumeSubscription(subscriptionId))
        .to.emit(contract, "SubscriptionStatusChanged")
        .withArgs(subscriptionId, 1, 0); // Paused -> Active

      const sub = await contract.getSubscription(subscriptionId);
      expect(sub.status).to.equal(0); // Active
      expect(sub.consecutiveFailures).to.equal(0); // Reset failures
    });

    it("Should allow subscriber to cancel subscription", async function () {
      await expect(contract.connect(subscriber).cancelSubscription(subscriptionId))
        .to.emit(contract, "SubscriptionStatusChanged")
        .withArgs(subscriptionId, 0, 2); // Active -> Cancelled

      const sub = await contract.getSubscription(subscriptionId);
      expect(sub.status).to.equal(2); // Cancelled
    });

    it("Should reject non-subscriber pause attempts", async function () {
      await expect(
        contract.connect(merchant).pauseSubscription(subscriptionId)
      ).to.be.revertedWithCustomError(contract, "Unauthorized");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update ICP signer", async function () {
      const newSigner = merchant.address;

      await expect(contract.updateICPSigner(newSigner))
        .to.emit(contract, "ICPSignerUpdated")
        .withArgs(icpSigner.address, newSigner);

      expect(await contract.icpSignerAddress()).to.equal(newSigner);
    });

    it("Should allow owner to update fee config", async function () {
      const newFeePercentage = 300; // 3%
      const newMinFee = ethers.parseUnits("0.10", 6);

      await expect(contract.updateFeeConfig(newFeePercentage, newMinFee))
        .to.emit(contract, "FeeConfigUpdated")
        .withArgs(newFeePercentage, newMinFee);

      const feeConfig = await contract.feeConfig();
      expect(feeConfig.feePercentageBasisPoints).to.equal(newFeePercentage);
      expect(feeConfig.minFeeAmount).to.equal(newMinFee);
    });

    it("Should reject fee > 10%", async function () {
      await expect(
        contract.updateFeeConfig(1001, 0) // 10.01%
      ).to.be.revertedWith("Fee too high");
    });

    it("Should allow owner to pause contract", async function () {
      await contract.pause();
      expect(await contract.paused()).to.equal(true);
    });

    it("Should reject non-owner admin calls", async function () {
      await expect(
        contract.connect(merchant).updateICPSigner(merchant.address)
      ).to.be.reverted;
    });
  });

  describe("View Functions", function () {
    it("Should return subscriber subscriptions", async function () {
      const sub1 = ethers.id("sub-1");
      const sub2 = ethers.id("sub-2");

      // Create two subscriptions
      for (const subId of [sub1, sub2]) {
        const nonce = ethers.randomBytes(32);
        const messageHash = ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ["string", "bytes32", "address", "address", "uint256", "uint256", "bytes32"],
            [
              "CREATE_SUBSCRIPTION",
              subId,
              subscriber.address,
              merchant.address,
              SUBSCRIPTION_AMOUNT,
              INTERVAL_SECONDS,
              nonce,
            ]
          )
        );

        const signature = await icpSigner.signMessage(ethers.getBytes(messageHash));

        await contract.connect(subscriber).createSubscription(
          subId,
          merchant.address,
          "Test",
          SUBSCRIPTION_AMOUNT,
          INTERVAL_SECONDS,
          1,
          signature,
          nonce
        );
      }

      const subs = await contract.getSubscriberSubscriptions(subscriber.address);
      expect(subs.length).to.equal(2);
      expect(subs[0]).to.equal(sub1);
      expect(subs[1]).to.equal(sub2);
    });

    it("Should correctly calculate fees", async function () {
      const amount = ethers.parseUnits("100", 6);
      const expectedFee = (amount * 200n) / 10000n; // 2%

      expect(await contract.calculateFee(amount)).to.equal(expectedFee);
    });

    it("Should check if subscription can be processed", async function () {
      const subscriptionId = ethers.id("test-can-process");
      const nonce = ethers.randomBytes(32);

      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["string", "bytes32", "address", "address", "uint256", "uint256", "bytes32"],
          [
            "CREATE_SUBSCRIPTION",
            subscriptionId,
            subscriber.address,
            merchant.address,
            SUBSCRIPTION_AMOUNT,
            INTERVAL_SECONDS,
            nonce,
          ]
        )
      );

      const signature = await icpSigner.signMessage(ethers.getBytes(messageHash));

      await contract.connect(subscriber).createSubscription(
        subscriptionId,
        merchant.address,
        "Test",
        SUBSCRIPTION_AMOUNT,
        INTERVAL_SECONDS,
        1,
        signature,
        nonce
      );

      // Should not be processable yet (time hasn't elapsed)
      expect(await contract.canProcessSubscription(subscriptionId)).to.equal(false);

      // Fast forward time
      const sub = await contract.getSubscription(subscriptionId);
      await time.increaseTo(sub.nextPaymentTime);

      // Now should be processable
      expect(await contract.canProcessSubscription(subscriptionId)).to.equal(true);
    });
  });
});
