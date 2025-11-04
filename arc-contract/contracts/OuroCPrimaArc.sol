// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title OuroCPrimaArc
 * @notice Recurring payment subscription protocol for Arc blockchain
 * @dev Designed to work with ICP Timer Canister for autonomous payment execution
 *
 * Key Features:
 * - USDC-native recurring subscriptions
 * - ICP Timer Canister signature verification (ECDSA)
 * - Automated payment processing via ICP HTTP outcalls
 * - Fee splitting (merchant/platform)
 * - Emergency controls and pause functionality
 * - Cross-chain ready (CCTP V2 integration planned)
 *
 * Architecture:
 * 1. User creates subscription and approves USDC spending
 * 2. ICP Timer Canister schedules autonomous payment triggers
 * 3. Timer generates ECDSA signature at trigger time
 * 4. Timer calls processTrigger() via HTTP outcall to Arc RPC
 * 5. Contract verifies signature and executes USDC transfer
 */
contract OuroCPrimaArc is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ============================================================================
    // Type Definitions
    // ============================================================================

    enum SubscriptionStatus {
        Active,
        Paused,
        Cancelled
    }

    enum AuthorizationMode {
        ICPSignature,     // ICP canister signature required (default)
        ManualOnly,       // User can manually trigger payments
        TimeBased,        // Anyone can trigger if time elapsed
        Hybrid            // Multiple methods enabled
    }

    struct FeeConfig {
        uint16 feePercentageBasisPoints;  // e.g., 200 = 2%, 100 = 1%
        uint64 minFeeAmount;               // Minimum fee in USDC (6 decimals)
    }

    struct Subscription {
        bytes32 id;                        // Unique subscription ID
        address subscriber;                // User paying the subscription
        address merchant;                  // Merchant receiving payments
        string merchantName;               // Merchant display name
        uint256 amount;                    // Payment amount in USDC (6 decimals)
        uint256 intervalSeconds;           // Payment interval
        uint256 nextPaymentTime;           // Next scheduled payment timestamp
        SubscriptionStatus status;         // Current status
        uint256 createdAt;                 // Creation timestamp
        uint256 lastPaymentTime;           // Last successful payment
        uint256 paymentsMade;              // Total number of payments
        uint256 totalPaid;                 // Total USDC paid (6 decimals)
        uint32 reminderDaysBeforePayment;  // Days before payment for reminder
        uint256 consecutiveFailures;       // Failed payment counter
    }

    // ============================================================================
    // State Variables
    // ============================================================================

    /// @notice USDC token contract (native on Arc)
    IERC20 public immutable usdc;

    /// @notice ICP Timer Canister signer address (for signature verification)
    address public icpSignerAddress;

    /// @notice Platform fee configuration
    FeeConfig public feeConfig;

    /// @notice Total number of subscriptions created
    uint256 public totalSubscriptions;

    /// @notice Authorization mode for payment processing
    AuthorizationMode public authorizationMode;

    /// @notice Platform fee collection address (ICP canister's Arc wallet)
    address public feeCollectionAddress;

    /// @notice Manual processing enabled flag
    bool public manualProcessingEnabled;

    /// @notice Time-based processing enabled flag
    bool public timeBasedProcessingEnabled;

    /// @notice Max consecutive failures before auto-pause
    uint256 public maxConsecutiveFailures = 10;

    /// @notice Mapping of subscription ID to Subscription struct
    mapping(bytes32 => Subscription) public subscriptions;

    /// @notice Mapping of subscriber address to their subscription IDs
    mapping(address => bytes32[]) public subscriberSubscriptions;

    /// @notice Mapping to track used signature nonces (replay protection)
    mapping(bytes32 => bool) public usedNonces;

    // ============================================================================
    // Events
    // ============================================================================

    event SubscriptionCreated(
        bytes32 indexed subscriptionId,
        address indexed subscriber,
        address indexed merchant,
        uint256 amount,
        uint256 intervalSeconds
    );

    event PaymentProcessed(
        bytes32 indexed subscriptionId,
        address indexed subscriber,
        address indexed merchant,
        uint256 amount,
        uint256 fee,
        uint256 paymentNumber
    );

    event SubscriptionStatusChanged(
        bytes32 indexed subscriptionId,
        SubscriptionStatus oldStatus,
        SubscriptionStatus newStatus
    );

    event PaymentFailed(
        bytes32 indexed subscriptionId,
        address subscriber,
        string reason,
        uint256 consecutiveFailures
    );

    event FeeConfigUpdated(
        uint16 feePercentageBasisPoints,
        uint64 minFeeAmount
    );

    event ICPSignerUpdated(
        address indexed oldSigner,
        address indexed newSigner
    );

    event FeeCollectionAddressUpdated(
        address indexed oldAddress,
        address indexed newAddress
    );

    // ============================================================================
    // Errors
    // ============================================================================

    error InvalidSubscriptionId();
    error SubscriptionNotActive();
    error PaymentTooEarly();
    error InsufficientAllowance();
    error InsufficientBalance();
    error InvalidSignature();
    error NonceAlreadyUsed();
    error Unauthorized();
    error InvalidAmount();
    error InvalidInterval();
    error MaxFailuresReached();

    // ============================================================================
    // Constructor
    // ============================================================================

    /**
     * @notice Initialize the contract
     * @param _usdc USDC token address on Arc
     * @param _icpSignerAddress ICP Timer Canister signer address
     * @param _feeCollectionAddress Platform fee collection address
     */
    constructor(
        address _usdc,
        address _icpSignerAddress,
        address _feeCollectionAddress
    ) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_icpSignerAddress != address(0), "Invalid ICP signer");
        require(_feeCollectionAddress != address(0), "Invalid fee address");

        usdc = IERC20(_usdc);
        icpSignerAddress = _icpSignerAddress;
        feeCollectionAddress = _feeCollectionAddress;

        // Default fee: 2% (200 basis points)
        feeConfig = FeeConfig({
            feePercentageBasisPoints: 200,
            minFeeAmount: 0
        });

        authorizationMode = AuthorizationMode.ICPSignature;
        manualProcessingEnabled = false;
        timeBasedProcessingEnabled = false;
    }

    // ============================================================================
    // External Functions - Subscription Management
    // ============================================================================

    /**
     * @notice Create a new recurring subscription
     * @param subscriptionId Unique subscription identifier
     * @param merchant Merchant receiving payments
     * @param merchantName Merchant display name
     * @param amount Payment amount per interval (USDC, 6 decimals)
     * @param intervalSeconds Payment interval in seconds
     * @param reminderDaysBeforePayment Days before payment to send reminder
     * @param icpSignature Signature from ICP Timer Canister authorizing creation
     * @param nonce Unique nonce for signature (replay protection)
     */
    function createSubscription(
        bytes32 subscriptionId,
        address merchant,
        string calldata merchantName,
        uint256 amount,
        uint256 intervalSeconds,
        uint32 reminderDaysBeforePayment,
        bytes calldata icpSignature,
        bytes32 nonce
    ) external whenNotPaused nonReentrant {
        // Validation
        if (subscriptionId == bytes32(0)) revert InvalidSubscriptionId();
        if (subscriptions[subscriptionId].subscriber != address(0)) {
            revert InvalidSubscriptionId(); // Already exists
        }
        if (amount == 0) revert InvalidAmount();
        if (intervalSeconds < 10) revert InvalidInterval(); // Min 10 seconds
        if (merchant == address(0)) revert Unauthorized();

        // Verify ICP signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "CREATE_SUBSCRIPTION",
                subscriptionId,
                msg.sender,
                merchant,
                amount,
                intervalSeconds,
                nonce
            )
        );
        _verifyICPSignature(messageHash, icpSignature, nonce);

        // Check USDC allowance
        uint256 allowance = usdc.allowance(msg.sender, address(this));
        if (allowance < amount) revert InsufficientAllowance();

        // Create subscription
        Subscription storage sub = subscriptions[subscriptionId];
        sub.id = subscriptionId;
        sub.subscriber = msg.sender;
        sub.merchant = merchant;
        sub.merchantName = merchantName;
        sub.amount = amount;
        sub.intervalSeconds = intervalSeconds;
        sub.nextPaymentTime = block.timestamp + intervalSeconds;
        sub.status = SubscriptionStatus.Active;
        sub.createdAt = block.timestamp;
        sub.lastPaymentTime = 0;
        sub.paymentsMade = 0;
        sub.totalPaid = 0;
        sub.reminderDaysBeforePayment = reminderDaysBeforePayment;
        sub.consecutiveFailures = 0;

        // Track subscriber's subscriptions
        subscriberSubscriptions[msg.sender].push(subscriptionId);
        totalSubscriptions++;

        emit SubscriptionCreated(
            subscriptionId,
            msg.sender,
            merchant,
            amount,
            intervalSeconds
        );
    }

    /**
     * @notice Process a recurring payment (called by ICP Timer via HTTP outcall)
     * @param subscriptionId Subscription to process
     * @param icpSignature Signature from ICP Timer Canister
     * @param nonce Unique nonce for this payment
     */
    function processTrigger(
        bytes32 subscriptionId,
        bytes calldata icpSignature,
        bytes32 nonce
    ) external whenNotPaused nonReentrant {
        Subscription storage sub = subscriptions[subscriptionId];

        // Validation
        if (sub.subscriber == address(0)) revert InvalidSubscriptionId();
        if (sub.status != SubscriptionStatus.Active) revert SubscriptionNotActive();
        if (block.timestamp < sub.nextPaymentTime) revert PaymentTooEarly();
        if (sub.consecutiveFailures >= maxConsecutiveFailures) {
            revert MaxFailuresReached();
        }

        // Verify ICP signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "PROCESS_PAYMENT",
                subscriptionId,
                sub.nextPaymentTime,
                sub.amount,
                nonce
            )
        );
        _verifyICPSignature(messageHash, icpSignature, nonce);

        // Execute payment
        _executePayment(subscriptionId);
    }

    /**
     * @notice Manually process payment (if enabled)
     * @param subscriptionId Subscription to process
     */
    function processManualPayment(bytes32 subscriptionId)
        external
        whenNotPaused
        nonReentrant
    {
        if (!manualProcessingEnabled) revert Unauthorized();

        Subscription storage sub = subscriptions[subscriptionId];
        if (sub.subscriber != msg.sender) revert Unauthorized();
        if (sub.status != SubscriptionStatus.Active) revert SubscriptionNotActive();

        _executePayment(subscriptionId);
    }

    /**
     * @notice Pause a subscription (subscriber only)
     * @param subscriptionId Subscription to pause
     */
    function pauseSubscription(bytes32 subscriptionId) external {
        Subscription storage sub = subscriptions[subscriptionId];
        if (sub.subscriber != msg.sender) revert Unauthorized();
        if (sub.status != SubscriptionStatus.Active) revert SubscriptionNotActive();

        SubscriptionStatus oldStatus = sub.status;
        sub.status = SubscriptionStatus.Paused;

        emit SubscriptionStatusChanged(subscriptionId, oldStatus, SubscriptionStatus.Paused);
    }

    /**
     * @notice Resume a paused subscription
     * @param subscriptionId Subscription to resume
     */
    function resumeSubscription(bytes32 subscriptionId) external {
        Subscription storage sub = subscriptions[subscriptionId];
        if (sub.subscriber != msg.sender) revert Unauthorized();
        if (sub.status != SubscriptionStatus.Paused) revert();

        SubscriptionStatus oldStatus = sub.status;
        sub.status = SubscriptionStatus.Active;

        // Reset next payment time
        sub.nextPaymentTime = block.timestamp + sub.intervalSeconds;
        sub.consecutiveFailures = 0; // Reset failure counter

        emit SubscriptionStatusChanged(subscriptionId, oldStatus, SubscriptionStatus.Active);
    }

    /**
     * @notice Cancel a subscription permanently
     * @param subscriptionId Subscription to cancel
     */
    function cancelSubscription(bytes32 subscriptionId) external {
        Subscription storage sub = subscriptions[subscriptionId];
        if (sub.subscriber != msg.sender && msg.sender != owner()) {
            revert Unauthorized();
        }

        SubscriptionStatus oldStatus = sub.status;
        sub.status = SubscriptionStatus.Cancelled;

        emit SubscriptionStatusChanged(subscriptionId, oldStatus, SubscriptionStatus.Cancelled);
    }

    // ============================================================================
    // Internal Functions
    // ============================================================================

    /**
     * @notice Execute payment for a subscription
     * @param subscriptionId Subscription to process
     */
    function _executePayment(bytes32 subscriptionId) internal {
        Subscription storage sub = subscriptions[subscriptionId];

        // Calculate fee
        uint256 feeAmount = _calculateFee(sub.amount);
        uint256 merchantAmount = sub.amount - feeAmount;

        // Check balance and allowance
        uint256 balance = usdc.balanceOf(sub.subscriber);
        uint256 allowance = usdc.allowance(sub.subscriber, address(this));

        if (balance < sub.amount) {
            sub.consecutiveFailures++;
            emit PaymentFailed(
                subscriptionId,
                sub.subscriber,
                "Insufficient balance",
                sub.consecutiveFailures
            );

            // Auto-pause if max failures reached
            if (sub.consecutiveFailures >= maxConsecutiveFailures) {
                sub.status = SubscriptionStatus.Paused;
                emit SubscriptionStatusChanged(
                    subscriptionId,
                    SubscriptionStatus.Active,
                    SubscriptionStatus.Paused
                );
            }
            return;
        }

        if (allowance < sub.amount) {
            sub.consecutiveFailures++;
            emit PaymentFailed(
                subscriptionId,
                sub.subscriber,
                "Insufficient allowance",
                sub.consecutiveFailures
            );

            if (sub.consecutiveFailures >= maxConsecutiveFailures) {
                sub.status = SubscriptionStatus.Paused;
                emit SubscriptionStatusChanged(
                    subscriptionId,
                    SubscriptionStatus.Active,
                    SubscriptionStatus.Paused
                );
            }
            return;
        }

        // Execute transfers
        try usdc.transferFrom(sub.subscriber, sub.merchant, merchantAmount) {
            // Transfer successful
            if (feeAmount > 0) {
                usdc.transferFrom(sub.subscriber, feeCollectionAddress, feeAmount);
            }

            // Update subscription state
            sub.lastPaymentTime = block.timestamp;
            sub.nextPaymentTime = block.timestamp + sub.intervalSeconds;
            sub.paymentsMade++;
            sub.totalPaid += sub.amount;
            sub.consecutiveFailures = 0; // Reset failure counter

            emit PaymentProcessed(
                subscriptionId,
                sub.subscriber,
                sub.merchant,
                merchantAmount,
                feeAmount,
                sub.paymentsMade
            );
        } catch Error(string memory reason) {
            sub.consecutiveFailures++;
            emit PaymentFailed(subscriptionId, sub.subscriber, reason, sub.consecutiveFailures);

            if (sub.consecutiveFailures >= maxConsecutiveFailures) {
                sub.status = SubscriptionStatus.Paused;
                emit SubscriptionStatusChanged(
                    subscriptionId,
                    SubscriptionStatus.Active,
                    SubscriptionStatus.Paused
                );
            }
        }
    }

    /**
     * @notice Calculate platform fee
     * @param amount Payment amount
     * @return Fee amount
     */
    function _calculateFee(uint256 amount) internal view returns (uint256) {
        uint256 fee = (amount * feeConfig.feePercentageBasisPoints) / 10000;
        return fee > feeConfig.minFeeAmount ? fee : feeConfig.minFeeAmount;
    }

    /**
     * @notice Verify ICP canister signature
     * @param messageHash Hash of the message
     * @param signature Signature to verify
     * @param nonce Nonce for replay protection
     */
    function _verifyICPSignature(
        bytes32 messageHash,
        bytes memory signature,
        bytes32 nonce
    ) internal {
        // Check nonce hasn't been used
        if (usedNonces[nonce]) revert NonceAlreadyUsed();
        usedNonces[nonce] = true;

        // Verify signature
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedMessageHash.recover(signature);

        if (recoveredSigner != icpSignerAddress) revert InvalidSignature();
    }

    // ============================================================================
    // Admin Functions
    // ============================================================================

    /**
     * @notice Update ICP signer address
     * @param newSigner New ICP signer address
     */
    function updateICPSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Invalid signer");
        address oldSigner = icpSignerAddress;
        icpSignerAddress = newSigner;
        emit ICPSignerUpdated(oldSigner, newSigner);
    }

    /**
     * @notice Update fee configuration
     * @param newFeePercentageBasisPoints New fee percentage (basis points)
     * @param newMinFeeAmount New minimum fee amount
     */
    function updateFeeConfig(
        uint16 newFeePercentageBasisPoints,
        uint64 newMinFeeAmount
    ) external onlyOwner {
        require(newFeePercentageBasisPoints <= 1000, "Fee too high"); // Max 10%

        feeConfig.feePercentageBasisPoints = newFeePercentageBasisPoints;
        feeConfig.minFeeAmount = newMinFeeAmount;

        emit FeeConfigUpdated(newFeePercentageBasisPoints, newMinFeeAmount);
    }

    /**
     * @notice Update fee collection address
     * @param newAddress New fee collection address
     */
    function updateFeeCollectionAddress(address newAddress) external onlyOwner {
        require(newAddress != address(0), "Invalid address");
        address oldAddress = feeCollectionAddress;
        feeCollectionAddress = newAddress;
        emit FeeCollectionAddressUpdated(oldAddress, newAddress);
    }

    /**
     * @notice Update max consecutive failures
     * @param newMax New maximum consecutive failures
     */
    function updateMaxConsecutiveFailures(uint256 newMax) external onlyOwner {
        require(newMax > 0 && newMax <= 100, "Invalid max");
        maxConsecutiveFailures = newMax;
    }

    /**
     * @notice Enable/disable manual processing
     * @param enabled Whether manual processing is enabled
     */
    function setManualProcessingEnabled(bool enabled) external onlyOwner {
        manualProcessingEnabled = enabled;
    }

    /**
     * @notice Pause the contract (emergency)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============================================================================
    // View Functions
    // ============================================================================

    /**
     * @notice Get subscription details
     * @param subscriptionId Subscription ID
     * @return Subscription struct
     */
    function getSubscription(bytes32 subscriptionId)
        external
        view
        returns (Subscription memory)
    {
        return subscriptions[subscriptionId];
    }

    /**
     * @notice Get all subscription IDs for a subscriber
     * @param subscriber Subscriber address
     * @return Array of subscription IDs
     */
    function getSubscriberSubscriptions(address subscriber)
        external
        view
        returns (bytes32[] memory)
    {
        return subscriberSubscriptions[subscriber];
    }

    /**
     * @notice Check if a subscription can be processed
     * @param subscriptionId Subscription ID
     * @return Whether the subscription can be processed
     */
    function canProcessSubscription(bytes32 subscriptionId)
        external
        view
        returns (bool)
    {
        Subscription storage sub = subscriptions[subscriptionId];

        if (sub.subscriber == address(0)) return false;
        if (sub.status != SubscriptionStatus.Active) return false;
        if (block.timestamp < sub.nextPaymentTime) return false;
        if (sub.consecutiveFailures >= maxConsecutiveFailures) return false;

        uint256 balance = usdc.balanceOf(sub.subscriber);
        uint256 allowance = usdc.allowance(sub.subscriber, address(this));

        return balance >= sub.amount && allowance >= sub.amount;
    }

    /**
     * @notice Calculate fee for a given amount
     * @param amount Payment amount
     * @return Fee amount
     */
    function calculateFee(uint256 amount) external view returns (uint256) {
        return _calculateFee(amount);
    }
}
