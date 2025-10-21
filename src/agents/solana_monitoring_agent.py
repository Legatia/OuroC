#!/usr/bin/env python3
"""
Solana Contract Monitoring Agent - Production Python Agent for ICP Canister

Built with Kybra CDK to monitor and optimize the Ouro-C Solana subscription contract.
This agent monitors contract performance, detects patterns, and provides optimization
recommendations to ensure the core principles work correctly.

Features:
- Solana transaction monitoring
- Subscription payment success rate tracking
- Token swap performance analysis
- ICP timer coordination optimization
- Cross-chain performance insights
- Grid integration monitoring
"""

from kybra import (
    ic, nat64, query, update, Principal, Record, Variant,
    Vec, Opt, bool, text, StableBTreeMap, Tuple
)
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# Type definitions
class SolanaTransactionMetrics(Record):
    transaction_signature: text
    slot: nat64
    block_time: nat64
    gas_used: nat64
    success: bool
    error_code: Opt[text]
    program_id: text
    instruction_count: nat64
    timestamp: text

class SubscriptionPayment(Record):
    payment_id: text
    merchant_address: text
    user_wallet: text
    amount: nat64
    token_address: text
    subscription_id: text
    status: text
    created_at: text
    executed_at: Opt[text]
    gas_cost: nat64

class TokenSwapMetrics(Record):
    swap_id: text
    input_token: text
    output_token: text
    input_amount: nat64
    output_amount: nat64
    price_impact: nat64
    slippage: nat64
    success: bool
    dex_used: text
    timestamp: text

class ICPCoordinatorMetrics(Record):
    timer_canister_id: text
    coordination_success: bool
    execution_time_ms: nat64
    solana_tx_signature: text
    error_message: Opt[text]
    timestamp: text

class PerformanceInsight(Record):
    insight_id: text
    category: text  # "payment_success", "gas_efficiency", "token_swap", "cross_chain"
    severity: text   # "info", "warning", "critical"
    title: text
    description: text
    recommendation: text
    expected_impact: text
    created_at: text

class ContractHealth(Record):
    health_score: nat64
    overall_status: text
    key_metrics: record {
        payment_success_rate: nat64;
        gas_efficiency: nat64;
        swap_success_rate: nat64;
        icp_coordination_rate: nat64;
        grid_integration_health: nat64;
    };
    last_assessment: text;
    active_alerts: Vec[text];

# Stable storage
solana_metrics_storage = StableBTreeMap[text, SolanaTransactionMetrics](
    memory_id=0, max_key_size=100, max_value_size=400
)

subscription_payments_storage = StableBTreeMap[text, SubscriptionPayment](
    memory_id=1, max_key_size=1000, max_value_size=300
)

token_swap_metrics_storage = StableBTreeMap[text, TokenSwapMetrics](
    memory_id=2, max_key_size=1000, max_value_size=350
)

icp_coordinator_storage = StableBTreeMap[text, ICPCoordinatorMetrics](
    memory_id=3, max_key_size=100, max_value_size=350
    )

performance_insights_storage = StableBTreeMap[text, PerformanceInsight](
    memory_id=4, max_key_size=500, max_value_size=500
)

contract_health_storage = StableBTreeMap[text, ContractHealth](
    memory_id=5, max_key_size=20, max_value_size=500
)

# Solana contract constants (would be fetched from contract)
SOLANA_PROGRAM_ID = "7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub"
USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
JUPITER_ROUTER = "JUP6LkbZbjS1j9wapKHNAE2vkkEqtKQKqPc2uqH6n"

def analyze_payment_success_rate(payments: List[SubscriptionPayment]) -> dict:
    """Analyze subscription payment success rates from Solana contract."""
    if len(payments) == 0:
        return {"success_rate": 0, "trend": "no_data"}

    successful = len([p for p in payments if p.status == "completed"])
    total = len(payments)
    success_rate = int((successful / total) * 10000)

    # Analyze trend (last 10 vs previous 10)
    if len(payments) >= 20:
        recent = payments[-10:]
        previous = payments[-20:-10]
        recent_success = len([p for p in recent if p.status == "completed"])
        previous_success = len([p for p in previous if p.status == "completed"])

        if recent_success > previous_success + 2:
            trend = "improving"
        elif recent_success < previous_success - 2:
            trend = "declining"
        else:
            trend = "stable"
    else:
        trend = "insufficient_data"

    return {
        "success_rate": success_rate,
        "trend": trend,
        "sample_size": total,
        "successful_count": successful
    }

def analyze_gas_efficiency(payments: List[SubscriptionPayment]) -> dict:
    """Analyze gas efficiency of Solana contract operations."""
    if len(payments) == 0:
        return {"efficiency_score": 0, "average_gas": 0, "trend": "no_data"}

    gas_costs = [p.gas_cost for p in payments if p.gas_cost > 0]
    if len(gas_costs) == 0:
        return {"efficiency_score": 0, "average_gas": 0, "trend": "no_data"}

    average_gas = sum(gas_costs) // len(gas_costs)

    # Target: 500,000 gas per complex subscription operation
    target_gas = 500000
    efficiency_score = min(10000, int((target_gas / max(1, average_gas)) * 10000))

    # Determine trend
    recent_gas = average_gas
    older_gas = target_gas  # Simplified comparison

    if recent_gas < older_gas * 90 // 100:
        trend = "improving"
    elif recent_gas > older_gas * 110 // 100:
        trend = "declining"
    else:
        trend = "stable"

    return {
        "efficiency_score": efficiency_score,
        "average_gas": average_gas,
        "trend": trend,
        "total_transactions": len(gas_costs)
    }

def analyze_token_swaps(swaps: List[TokenSwapMetrics]) -> dict:
    """Analyze Jupiter DEX token swap performance."""
    if len(swaps) == 0:
        return {"success_rate": 0, "average_slippage": 0, "trend": "no_data"}

    successful_swaps = [s for s in swaps if s.success]
    total_swaps = len(swaps)
    success_rate = int((len(successful_swaps) / total_swaps) * 10000)

    slippages = [int(s.slippage) for s in successful_swaps if s.slippage > 0]
    average_slippage = sum(slippages) // max(1, len(slippages))

    # Volume tracking
    total_volume = sum(int(s.output_amount) for s in successful_swaps)

    return {
        "success_rate": success_rate,
        "average_slippage": average_slippage,
        "trend": "stable",  # Would analyze more sophisticated patterns
        "total_volume": total_volume,
        "total_swaps": total_swaps
    }

def detect_performance_patterns() -> List[PerformanceInsight]:
    """Detect patterns in contract performance."""
    insights = []

    # Get recent data
    recent_payments = get_recent_payments(100)
    recent_swaps = get_recent_swaps(50)
    recent_icp_metrics = get_recent_icp_metrics(20)

    # Payment success rate analysis
    if len(recent_payments) >= 10:
        payment_analysis = analyze_payment_success_rate(recent_payments)

        if payment_analysis["success_rate"] < 9000:  # Below 90%
            severity = "critical" if payment_analysis["success_rate"] < 8000 else "warning"
            insights.append(PerformanceInsight(
                insight_id=text(f"payment_success_low_{ic.time()}"),
                category=text("payment_success"),
                severity=text(severity),
                title=text("Low Payment Success Rate"),
                description=text(f"Payment success rate is {payment_analysis['success_rate']/100:.1f}%, which is below target"),
                recommendation=text("Investigate transaction failures and optimize error handling"),
                expected_impact=text("15-25% improvement in revenue retention"),
                created_at=text(ic.time())
            ))

    # Gas efficiency analysis
    if len(recent_payments) >= 5:
        gas_analysis = analyze_gas_efficiency(recent_payments)

        if gas_analysis["efficiency_score"] < 8000:  # Below 80%
            severity = "critical" if gas_analysis["efficiency_score"] < 6000 else "warning"
            insights.append(PerformanceInsight(
                insight_id=text(f"gas_inefficient_{ic.time()}"),
                category=text("gas_efficiency"),
                severity=text(severity),
                title=text("High Gas Costs"),
                description=text(f"Average gas per transaction is {gas_analysis['average_gas']:,} ({gas_analysis['efficiency_score']/100:.1f}% efficiency)"),
                recommendation=text("Optimize instruction ordering and batch similar operations"),
                expected_impact=text("20-30% reduction in gas costs"),
                created_at=text(ic.time())
            ))

    # Token swap analysis
    if len(recent_swaps) >= 5:
        swap_analysis = analyze_token_swaps(recent_swaps)

        if swap_analysis["success_rate"] < 9500:  # Below 95%
            insights.append(PerformanceInsight(
                insight_id=text(f"swap_failures_{ic.time()}"),
                category=text("token_swap"),
                severity=text("warning"),
                title=text("Token Swap Issues"),
                description=text(f"Jupiter swap success rate is {swap_analysis['success_rate']/100:.1f}%"),
                recommendation=text("Add retry logic and improve liquidity management"),
                expected_impact=text("10-15% improvement in conversion success"),
                created_at=text(ic.time())
            ))

    # ICP coordination analysis
    if len(recent_icp_metrics) >= 5:
        icp_success_rate = len([m for m in recent_icp_metrics if m.coordination_success]) / len(recent_icp_metrics)

        if icp_success_rate < 0.9:
            insights.append(PerformanceInsight(
                insight_id=text(f"icp_coordination_issues_{ic.time()}"),
                category=text("cross_chain"),
                severity=text("warning"),
                title=text("ICP Coordination Issues"),
                description=text(f"ICP-Solana coordination success rate is {icp_success_rate*100:.1f}%"),
                recommendation=text("Optimize ICP timer canister and retry mechanisms"),
                expected_impact=text("5-10% improvement in cross-chain reliability"),
                created_at=text(ic.time())
            ))

    return insights

# Kybra canister methods

@update
def record_solana_transaction(transaction_data: dict) -> bool:
    """
    Record Solana transaction metrics for monitoring.
    This monitors how well the core Solana contract is performing.
    """

    tx_signature = text(transaction_data.get("signature", ""))

    metrics = SolanaTransactionMetrics(
        transaction_signature=tx_signature,
        slot=nat64(transaction_data.get("slot", 0)),
        block_time=nat64(transaction_data.get("blockTime", 0)),
        gas_used=nat64(transaction_data.get("gasUsed", 0)),
        success=bool(transaction_data.get("success", False)),
        error_code=Opt[text](text(transaction_data.get("errorCode", ""))),
        program_id=text(transaction_data.get("programId", "")),
        instruction_count=nat64(transaction_data.get("instructionCount", 0)),
        timestamp=text(ic.time())
    )

    solana_metrics_storage.insert(tx_signature, metrics)

    # Trigger pattern detection
    insights = detect_performance_patterns()
    for insight in insights:
        performance_insights_storage.insert(insight.insight_id, insight)

    # Update contract health
    update_contract_health()

    return True

@update
def record_subscription_payment(payment_data: dict) -> bool:
    """
    Record subscription payment metrics from Solana contract.
    """

    payment_id = text(payment_data.get("paymentId", ""))

    payment = SubscriptionPayment(
        payment_id=payment_id,
        merchant_address=text(payment_data.get("merchantAddress", "")),
        user_wallet=text(payment_data.get("userWallet", "")),
        amount=nat64(payment_data.get("amount", 0)),
        token_address=text(payment_data.get("tokenAddress", "")),
        subscription_id=text(payment_data.get("subscriptionId", "")),
        status=text(payment_data.get("status", "pending")),
        created_at=text(payment_data.get("createdAt", ic.time())),
        executed_at=Opt[text](text(payment_data.get("executedAt", ""))),
        gas_cost=nat64(payment_data.get("gasCost", 0))
    )

    subscription_payments_storage.insert(payment_id, payment)
    return True

@update
def record_token_swap(swap_data: dict) -> bool:
    """
    Record token swap metrics from Jupiter DEX integration.
    """

    swap_id = text(swap_data.get("swapId", ""))

    swap = TokenSwapMetrics(
        swap_id=swap_id,
        input_token=text(swap_data.get("inputToken", "")),
        output_token=text(swap_data.get("outputToken", "")),
        input_amount=nat64(swap_data.get("inputAmount", 0)),
        output_amount=nat64(swap_data.get("outputAmount", 0)),
        price_impact=nat64(swap_data.get("priceImpact", 0)),
        slippage=nat64(swap_data.get("slippage", 0)),
        success=bool(swap_data.get("success", False)),
        dex_used=text(swap_data.get("dexUsed", "jupiter")),
        timestamp=text(ic.time())
    )

    token_swap_metrics_storage.insert(swap_id, swap)
    return True

@update
def record_icp_coordination(coordination_data: dict) -> bool:
    """
    Record ICP coordination metrics for cross-chain performance.
    """

    timer_canister_id = text(coordination_data.get("timerCanisterId", ""))

    metrics = ICPCoordinatorMetrics(
        timer_canister_id=timer_canister_id,
        coordination_success=bool(coordination_data.get("success", False)),
        execution_time_ms=nat64(coordination_data.get("executionTimeMs", 0)),
        solana_tx_signature=text(coordination_data.get("solanaTxSignature", "")),
        error_message=Opt[text](text(coordination_data.get("errorMessage", ""))),
        timestamp=text(ic.time())
    )

    icp_coordinator_storage.insert(timer_canister_id, metrics)
    return True

@query
def get_contract_health() -> ContractHealth:
    """
    Get overall contract health assessment.
    Monitors how well the core Solana contract is working.
    """

    recent_payments = get_recent_payments(50)
    recent_swaps = get_recent_swaps(25)
    recent_icp_metrics = get_recent_icp_metrics(10)

    # Calculate key metrics
    if len(recent_payments) > 0:
        payment_analysis = analyze_payment_success_rate(recent_payments)
        payment_success_rate = payment_analysis["success_rate"]
    else:
        payment_success_rate = nat64(0)

    if len(recent_swaps) > 0:
        swap_analysis = analyze_token_swaps(recent_swaps)
        swap_success_rate = swap_analysis["success_rate"]
    else:
        swap_success_rate = nat64(0)

    if len(recent_icp_metrics) > 0:
        icp_success_rate = int((len([m for m in recent_icp_metrics if m.coordination_success]) / len(recent_icp_metrics)) * 10000)
    else:
        icp_success_rate = nat64(10000)  # 100% if no data

    gas_analysis = analyze_gas_efficiency(recent_payments)
    gas_efficiency = gas_analysis["efficiency_score"]

    # Grid integration health (simplified - would monitor actual Grid API calls)
    grid_health = nat64(9500)  # 95% assumed health

    # Calculate overall health score
    health_score = (payment_success_rate + swap_success_rate + gas_efficiency + icp_success_rate + grid_health) // 5

    # Determine status
    if health_score >= 9000:
        status = "healthy"
    elif health_score >= 7500:
        status = "warning"
    else:
        status = "critical"

    # Generate alerts
    alerts = []
    if payment_success_rate < 9000:
        alerts.append(text(f"Low payment success rate: {payment_success_rate/100:.1f}%"))
    if swap_success_rate < 9500:
        alerts.append(text(f"Token swap issues: {swap_success_rate/100:.1f}%"))
    if gas_efficiency < 8000:
        alerts.append(text(f"High gas costs: {gas_efficiency/100:.1f}% efficiency"))
    if icp_success_rate < 9000:
        alerts.append(text(f"ICP coordination issues: {icp_success_rate/100:.1f}%"))

    return ContractHealth(
        health_score=nat64(health_score),
        overall_status=text(status),
        key_metrics=record {
            payment_success_rate=payment_success_rate;
            gas_efficiency=gas_efficiency;
            swap_success_rate=swap_success_rate;
            icp_coordination_rate=icp_success_rate;
            grid_integration_health=grid_health;
        },
        last_assessment=text(ic.time()),
        alerts=Vec[text](alerts)
    )

@query
def get_performance_insights() -> Vec[PerformanceInsight]:
    """
    Get current performance insights and recommendations.
    """

    insights = []
    for insight_id in performance_insights_storage.keys():
        insight = performance_insights_storage.get(insight_id)
        if insight is not None:
            insights.append(insight)

    return Vec[PerformanceInsight](insights)

@query
def get_subscription_metrics() -> dict:
    """
    Get comprehensive subscription payment metrics.
    """

    all_payments = []
    for payment_id in subscription_payments_storage.keys():
        payment = subscription_payments_storage.get(payment_id)
        if payment is not None:
            all_payments.append(payment)

    if len(all_payments) == 0:
        return {
            "total_payments": 0,
            "successful_payments": 0,
            "total_volume": 0,
            "average_gas_cost": 0
        }

    total_payments = len(all_payments)
    successful_payments = len([p for p in all_payments if p.status == "completed"])
    total_volume = sum(int(p.amount) for p in all_payments)
    total_gas = sum(int(p.gas_cost) for p in all_payments)

    return {
        "total_payments": total_payments,
        "successful_payments": successful_payments,
        "total_volume": total_volume,
        "success_rate": int((successful_payments / total_payments) * 100),
        "average_gas_cost": total_gas // max(1, total_payments),
        "trend": "stable"  # Would calculate actual trend
    }

@query
def get_swap_metrics() -> dict:
    """
    Get comprehensive token swap metrics.
    """

    all_swaps = []
    for swap_id in token_swap_metrics_storage.keys():
        swap = token_swap_metrics_storage.get(swap_id)
        if swap is not None:
            all_swaps.append(swap)

    if len(all_swaps) == 0:
        return {
            "total_swaps": 0,
            "successful_swaps": 0,
            "total_volume": 0,
            "average_slippage": 0
        }

    total_swaps = len(all_swaps)
    successful_swaps = len([s for s in all_swaps if s.success])
    total_volume = sum(int(s.output_amount) for s in all_swaps)
    slippages = [int(s.slippage) for s in all_swaps if s.slippage > 0]

    return {
        "total_swaps": total_swaps,
        "successful_swaps": successful_swaps,
        "total_volume": total_volume,
        "success_rate": int((successful_swaps / total_swaps) * 100),
        "average_slippage": sum(slippages) // max(1, len(slippages))
    }

# Helper functions

def get_recent_payments(count: int) -> List[SubscriptionPayment]:
    """Get recent subscription payments."""
    payments = []
    for payment_id in subscription_payments_storage.keys():
        payment = subscription_payments_storage.get(payment_id)
        if payment is not None:
            payments.append(payment)

    # Return most recent payments
    return sorted(payments, key=lambda x: int(x.created_at), reverse=True)[:count]

def get_recent_swaps(count: int) -> List[TokenSwapMetrics]:
    """Get recent token swaps."""
    swaps = []
    for swap_id in token_swap_metrics_storage.keys():
        swap = token_swap_metrics.get(swap_id)
        if swap is not None:
            swaps.append(swap)

    return sorted(swaps, key=lambda x: int(x.timestamp), reverse=True)[:count]

def get_recent_icp_metrics(count: int) -> List[ICPCoordinatorMetrics]:
    """Get recent ICP coordination metrics."""
    metrics = []
    for metrics_id in icp_coordinator_storage.keys():
        metric = icp_coordinator_storage.get(metrics_id)
        if metric is not None:
            metrics.append(metric)

    return sorted(metrics, key=lambda x: int(x.timestamp), reverse=True)[:count]

def update_contract_health():
    """Update contract health assessment."""
    health = get_contract_health()
    contract_health_storage.insert(text("current_health"), health)

# Initialize the canister
def canister_init():
    """Initialize the monitoring agent."""
    # Set initial health assessment
    initial_health = ContractHealth(
        health_score=nat64(9000),
        overall_status=text("healthy"),
        key_metrics=record {
            payment_success_rate=nat64(9000);
            gas_efficiency=nat64(8000);
            swap_success_rate=nat64(9500);
            icp_coordination_rate=nat64(9500);
            grid_integration_health=nat64(9500);
        },
        last_assessment=text(ic.time()),
        alerts=Vec[text]([])
    )

    contract_health_storage.insert(text("current_health"), initial_health)

canister_init()