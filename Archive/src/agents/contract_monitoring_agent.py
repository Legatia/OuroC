#!/usr/bin/env python3
"""
Contract Monitoring Agent - Production Python Agent for ICP Canister

Built with Kybra CDK to monitor and optimize smart contract performance.
This agent DOES NOT execute transactions but monitors contract behavior and provides
optimization recommendations to ensure the core principles work correctly.

Features:
- Contract performance monitoring
- Transaction success rate tracking
- Gas cost analysis and optimization
- Failure pattern detection
- Predictive analytics for contract optimization
- Smart contract parameter recommendations
"""

from kybra import (
    ic, nat64, query, update, Principal, Record, Variant,
    Vec, Opt, bool, text, StableBTreeMap, Tuple
)
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# Type definitions
class ContractMetrics(Record):
    total_transactions: nat64
    successful_transactions: nat64
    failed_transactions: nat64
    total_gas_used: nat64
    average_gas_per_tx: nat64
    success_rate: nat64
    failure_rate: nat64
    timestamp: text

class TransactionPattern(Record):
    pattern_id: text
    pattern_type: text  # "failure_spike", "gas_increase", "success_drop"
    severity: text      # "low", "medium", "high", "critical"
    description: text
    affected_transactions: nat64
    detected_at: text
    recommendation: text

class OptimizationRecommendation(Record):
    recommendation_id: text
    category: text       # "gas_optimization", "parameter_tuning", "batch_adjustment"
    title: text
    description: text
    expected_improvement: nat64  # Percentage improvement
    implementation_difficulty: text  # "easy", "medium", "hard"
    priority: nat64
    created_at: text
    status: text  # "pending", "implemented", "rejected"

class ContractHealth(Record):
    health_score: nat64      # 0-100
    overall_status: text    # "healthy", "warning", "critical"
    key_metrics: record {
        transaction_success_rate: nat64;
        gas_efficiency: nat64;
        batch_performance: nat64;
        failure_recovery_rate: nat64;
    };
    last_assessment: text
    alerts: Vec[text]

class PerformanceBenchmark(Record):
    metric_name: text
    current_value: nat64
    benchmark_value: nat64
    performance_score: nat64  # Percentage of benchmark
    trend: text  # "improving", "stable", "declining"
    last_updated: text

# Stable storage
contract_metrics_storage = StableBTreeMap[text, ContractMetrics](
    memory_id=0, max_key_size=50, max_value_size=300
)

transaction_patterns_storage = StableBTreeMap[text, TransactionPattern](
    memory_id=1, max_key_size=100, max_value_size=400
)

optimization_recommendations_storage = StableBTreeMap[text, OptimizationRecommendation](
    memory_id=2, max_key_size=100, max_value_size=500
)

contract_health_storage = StableBTreeMap[text, ContractHealth](
    memory_id=3, max_key_size=20, max_value_size=400
)

performance_benchmarks_storage = StableBTreeMap[text, PerformanceBenchmark](
    memory_id=4, max_key_size=50, max_value_size=300
)

# Monitoring configuration
MONITORING_CONFIG = {
    "success_rate_threshold": 9500,  # 95%
    "gas_efficiency_threshold": 8000,  # 80%
    "pattern_detection_window": 3600,  # 1 hour
    "health_check_interval": 300,     # 5 minutes
    "recommendation_generation_interval": 3600  # 1 hour
}

def analyze_transaction_success_rate(recent_transactions: List[dict]) -> dict:
    """
    Analyze transaction success rate patterns.
    This monitors how well the contract is performing its core function.
    """
    if len(recent_transactions) == 0:
        return {"success_rate": 0, "trend": "no_data"}

    successful = len([tx for tx in recent_transactions if tx["status"] == "success"])
    total = len(recent_transactions)
    success_rate = int((successful / total) * 10000)

    # Compare with historical data
    historical_rate = 9000  # 90% baseline
    if success_rate > historical_rate + 500:  # 5% improvement
        trend = "improving"
    elif success_rate < historical_rate - 500:  # 5% decline
        trend = "declining"
    else:
        trend = "stable"

    return {
        "success_rate": success_rate,
        "trend": trend,
        "sample_size": total
    }

def analyze_gas_efficiency(recent_transactions: List[dict]) -> dict:
    """
    Analyze gas efficiency of contract operations.
    Monitors if batching and other optimizations are working correctly.
    """
    if len(recent_transactions) == 0:
        return {"efficiency_score": 0, "average_gas": 0, "trend": "no_data"}

    gas_costs = [tx.get("gas_used", 0) for tx in recent_transactions]
    average_gas = sum(gas_costs) // len(gas_costs)

    # Benchmark against expected values
    # Single transaction: ~50,000 gas
    # Batched transaction: ~150,000 gas for 10 payments = 15,000 per payment
    expected_gas_per_payment = 15000  # Assume batching is working

    if average_gas <= expected_gas_per_payment:
        efficiency_score = 10000  # 100%
    else:
        efficiency_score = int((expected_gas_per_payment / average_gas) * 10000)

    # Determine trend
    recent_avg = average_gas
    older_avg = expected_gas_per_payment  # Simplified

    if recent_avg < older_avg * 90 // 100:  # 10% better
        trend = "improving"
    elif recent_avg > older_avg * 110 // 100:  # 10% worse
        trend = "declining"
    else:
        trend = "stable"

    return {
        "efficiency_score": efficiency_score,
        "average_gas": average_gas,
        "trend": trend
    }

def detect_failure_patterns(recent_transactions: List[dict]) -> List[TransactionPattern]:
    """
    Detect patterns in transaction failures.
    Helps identify when the core principles aren't working correctly.
    """
    patterns = []

    # Check for sudden spike in failures
    failed_tx = [tx for tx in recent_transactions if tx["status"] == "failed"]
    failure_rate = len(failed_tx) / max(1, len(recent_transactions))

    if failure_rate > 0.1:  # More than 10% failure rate
        patterns.append(TransactionPattern(
            pattern_id=text(f"failure_spike_{ic.time()}"),
            pattern_type=text("failure_spike"),
            severity=text("high" if failure_rate > 0.2 else "medium"),
            description=text(f"Sudden spike in transaction failures: {int(failure_rate * 100)}%"),
            affected_transactions=nat64(len(failed_tx)),
            detected_at=text(ic.time()),
            recommendation=text("Investigate contract state and external dependencies")
        ))

    # Check for specific error patterns
    error_types = {}
    for tx in failed_tx:
        error_type = tx.get("error_type", "unknown")
        error_types[error_type] = error_types.get(error_type, 0) + 1

    for error_type, count in error_types.items():
        if count > 3:  # Same error repeated multiple times
            patterns.append(TransactionPattern(
                pattern_id=text(f"error_pattern_{error_type}_{ic.time()}"),
                pattern_type=text("repeated_error"),
                severity=text("medium"),
                description=text(f"Repeated error type: {error_type} ({count} occurrences)"),
                affected_transactions=nat64(count),
                detected_at=text(ic.time()),
                recommendation=text(f"Fix underlying issue causing {error_type}")
            ))

    return patterns

def generate_optimization_recommendations(metrics: dict) -> List[OptimizationRecommendation]:
    """
    Generate recommendations for contract optimization.
    These help improve the core principles implementation.
    """
    recommendations = []

    # Success rate optimization
    if metrics["success_rate"] < 9500:  # Below 95%
        recommendations.append(OptimizationRecommendation(
            recommendation_id=text(f"success_optimization_{ic.time()}"),
            category=text("parameter_tuning"),
            title=text("Improve Transaction Success Rate"),
            description=text(f"Current success rate ({metrics['success_rate']/100:.1f}%) is below target (95%). Consider improving error handling and retry logic."),
            expected_improvement=nat64(500),  # 5% improvement
            implementation_difficulty=text("medium"),
            priority=nat64(1),
            created_at=text(ic.time()),
            status=text("pending")
        ))

    # Gas efficiency optimization
    if metrics["gas_efficiency"] < 8000:  # Below 80%
        recommendations.append(OptimizationRecommendation(
            recommendation_id=text(f"gas_optimization_{ic.time()}"),
            category=text("gas_optimization"),
            title=text("Optimize Gas Usage"),
            description=text(f"Gas efficiency ({metrics['gas_efficiency']/100:.1f}%) can be improved by optimizing batching strategy and transaction ordering."),
            expected_improvement=nat64(2000),  # 20% improvement
            implementation_difficulty=text("easy"),
            priority=nat64(2),
            created_at=text(ic.time()),
            status=text("pending")
        ))

    # Batching optimization
    if metrics.get("batch_performance", 10000) < 9000:  # Below 90%
        recommendations.append(OptimizationRecommendation(
            recommendation_id=text(f"batch_optimization_{ic.time()}"),
            category=text("batch_adjustment"),
            title=text("Optimize Batching Parameters"),
            description=text("Batch performance can be improved by adjusting batch size thresholds and timing."),
            expected_improvement=nat64(1500),  # 15% improvement
            implementation_difficulty=text("easy"),
            priority=nat64(3),
            created_at=text(ic.time()),
            status=text("pending")
        ))

    return recommendations

# Kybra canister methods

@update
def record_transaction_metrics(transaction_data: dict) -> bool:
    """
    Record transaction metrics from smart contract execution.
    This monitors how well the core principles are working.
    """

    metrics_id = f"metrics_{ic.time() // 300}"  # 5-minute buckets

    # Get existing metrics for this time period
    existing_metrics = contract_metrics_storage.get(text(metrics_id))

    if existing_metrics is None:
        # Create new metrics entry
        metrics = ContractMetrics(
            total_transactions=nat64(1),
            successful_transactions=nat64(1 if transaction_data["status"] == "success" else 0),
            failed_transactions=nat64(0 if transaction_data["status"] == "success" else 1),
            total_gas_used=nat64(transaction_data.get("gas_used", 0)),
            average_gas_per_tx=nat64(transaction_data.get("gas_used", 0)),
            success_rate=nat64(10000 if transaction_data["status"] == "success" else 0),
            failure_rate=nat64(0 if transaction_data["status"] == "success" else 10000),
            timestamp=text(ic.time())
        )
    else:
        # Update existing metrics
        total_tx = int(existing_metrics.total_transactions) + 1
        success_tx = int(existing_metrics.successful_transactions) + (1 if transaction_data["status"] == "success" else 0)
        total_gas = int(existing_metrics.total_gas_used) + transaction_data.get("gas_used", 0)

        metrics = ContractMetrics(
            total_transactions=nat64(total_tx),
            successful_transactions=nat64(success_tx),
            failed_transactions=nat64(total_tx - success_tx),
            total_gas_used=nat64(total_gas),
            average_gas_per_tx=nat64(total_gas // total_tx),
            success_rate=nat64(int((success_tx / total_tx) * 10000)),
            failure_rate=nat64(int(((total_tx - success_tx) / total_tx) * 10000)),
            timestamp=existing_metrics.timestamp
        )

    contract_metrics_storage.insert(text(metrics_id), metrics)

    # Trigger pattern detection
    recent_metrics = get_recent_metrics(100)  # Last 100 time periods
    if len(recent_metrics) > 10:
        detect_and_store_patterns(recent_metrics)

    return True

@query
def get_contract_health() -> ContractHealth:
    """
    Get overall contract health assessment.
    Monitors if the core principles are working correctly.
    """
    recent_metrics = get_recent_metrics(100)

    if len(recent_metrics) == 0:
        return ContractHealth(
            health_score=nat64(0),
            overall_status=text("no_data"),
            key_metrics=record {
                transaction_success_rate: nat64(0);
                gas_efficiency: nat64(0);
                batch_performance: nat64(0);
                failure_recovery_rate: nat64(0);
            },
            last_assessment=text(ic.time()),
            alerts=Vec[text]([text("No data available")])
        )

    # Calculate key metrics
    total_transactions = sum(int(m.total_transactions) for m in recent_metrics)
    total_successful = sum(int(m.successful_transactions) for m in recent_metrics)
    success_rate = int((total_successful / max(1, total_transactions)) * 10000)

    total_gas = sum(int(m.total_gas_used) for m in recent_metrics)
    avg_gas_per_tx = total_gas // max(1, total_transactions)
    gas_efficiency = min(10000, int((15000 / max(1, avg_gas_per_tx)) * 10000))  # 15k is target

    # Calculate overall health score
    health_score = (success_rate + gas_efficiency) // 2

    # Determine status
    if health_score >= 9000:
        status = "healthy"
    elif health_score >= 7000:
        status = "warning"
    else:
        status = "critical"

    # Generate alerts
    alerts = []
    if success_rate < 9000:
        alerts.append(text(f"Low success rate: {success_rate/100:.1f}%"))
    if gas_efficiency < 8000:
        alerts.append(text(f"Poor gas efficiency: {gas_efficiency/100:.1f}%"))

    return ContractHealth(
        health_score=nat64(health_score),
        overall_status=text(status),
        key_metrics=record {
            transaction_success_rate: nat64(success_rate);
            gas_efficiency: nat64(gas_efficiency);
            batch_performance: nat64(9000);  # Would calculate from actual batch data
            failure_recovery_rate: nat64(8500);  # Would calculate from recovery data
        },
        last_assessment=text(ic.time()),
        alerts=Vec[text](alerts)
    )

@query
def get_optimization_recommendations() -> Vec[OptimizationRecommendation]:
    """
    Get current optimization recommendations.
    These help improve how the core principles work.
    """
    recommendations = []

    for rec_id in optimization_recommendations_storage.keys():
        rec = optimization_recommendations_storage.get(rec_id)
        if rec is not None and rec.status == text("pending"):
            recommendations.append(rec)

    return Vec[OptimizationRecommendation](recommendations)

@update
def implement_recommendation(recommendation_id: text) -> bool:
    """
    Mark a recommendation as implemented.
    Tracks which optimizations have been applied.
    """
    rec = optimization_recommendations_storage.get(recommendation_id)
    if rec is None:
        return False

    updated_rec = OptimizationRecommendation(
        recommendation_id=rec.recommendation_id,
        category=rec.category,
        title=rec.title,
        description=rec.description,
        expected_improvement=rec.expected_improvement,
        implementation_difficulty=rec.implementation_difficulty,
        priority=rec.priority,
        created_at=rec.created_at,
        status=text("implemented")
    )

    optimization_recommendations_storage.insert(recommendation_id, updated_rec)
    return True

@query
def get_performance_trends(timeframe: nat64) -> Vec[PerformanceBenchmark]:
    """
    Get performance trends over specified timeframe.
    Monitors how core principles performance changes over time.
    """
    # Get metrics for the specified timeframe (in minutes)
    cutoff_time = ic.time() - timeframe * 60
    relevant_metrics = []

    for metrics_id in contract_metrics_storage.keys():
        metrics = contract_metrics_storage.get(metrics_id)
        if metrics is not None and int(metrics.timestamp) > cutoff_time:
            relevant_metrics.append(metrics)

    if len(relevant_metrics) < 2:
        return Vec[PerformanceBenchmark]([])

    # Calculate trends
    trends = []

    # Success rate trend
    recent_success = relevant_metrics[-1].success_rate
    older_success = relevant_metrics[0].success_rate
    success_trend = "improving" if recent_success > older_success else "declining"

    trends.append(PerformanceBenchmark(
        metric_name=text("success_rate"),
        current_value=recent_success,
        benchmark_value=nat64(9500),  # 95% benchmark
        performance_score=min(10000, int((recent_success / 9500) * 10000)),
        trend=text(success_trend),
        last_updated=relevant_metrics[-1].timestamp
    ))

    # Gas efficiency trend
    recent_gas = relevant_metrics[-1].average_gas_per_tx
    older_gas = relevant_metrics[0].average_gas_per_tx
    gas_trend = "improving" if recent_gas < older_gas else "declining"

    trends.append(PerformanceBenchmark(
        metric_name=text("gas_efficiency"),
        current_value=nat64(15000 // max(1, recent_gas)),
        benchmark_value=nat64(10000),  # 100% efficiency
        performance_score=min(10000, int((15000 / max(1, recent_gas)) * 10000)),
        trend=text(gas_trend),
        last_updated=relevant_metrics[-1].timestamp
    ))

    return Vec[PerformanceBenchmark](trends)

# Helper functions

def get_recent_metrics(count: int) -> List[ContractMetrics]:
    """Get recent contract metrics."""
    metrics = []
    for metrics_id in contract_metrics_storage.keys():
        m = contract_metrics_storage.get(metrics_id)
        if m is not None:
            metrics.append(m)

    # Return most recent metrics
    return sorted(metrics, key=lambda x: int(x.timestamp), reverse=True)[:count]

def detect_and_store_patterns(recent_metrics: List[ContractMetrics]):
    """Detect and store performance patterns."""
    if len(recent_metrics) < 10:
        return

    # Simple pattern detection - would be more sophisticated in production
    latest_metrics = recent_metrics[-10:]

    # Check for declining success rate
    success_rates = [int(m.success_rate) for m in latest_metrics]
    if all(success_rates[i] > success_rates[i+1] for i in range(len(success_rates)-1)):
        # Consistent decline
        pattern = TransactionPattern(
            pattern_id=text(f"declining_success_{ic.time()}"),
            pattern_type=text("success_decline"),
            severity=text("high" if success_rates[-1] < 8000 else "medium"),
            description=text(f"Consistent decline in success rate over {len(success_rates)} periods"),
            affected_transactions=nat64(sum(int(m.total_transactions) for m in latest_metrics)),
            detected_at=text(ic.time()),
            recommendation=text("Investigate contract performance and external dependencies")
        )
        transaction_patterns_storage.insert(pattern.pattern_id, pattern)

# Initialize the canister
def canister_init():
    """Initialize the monitoring agent."""
    # Set initial benchmarks
    benchmarks = [
        PerformanceBenchmark(
            metric_name=text("success_rate"),
            current_value=nat64(9500),
            benchmark_value=nat64(9500),
            performance_score=nat64(10000),
            trend=text("stable"),
            last_updated=text(ic.time())
        ),
        PerformanceBenchmark(
            metric_name=text("gas_efficiency"),
            current_value=nat64(9000),
            benchmark_value=nat64(10000),
            performance_score=nat64(9000),
            trend=text("stable"),
            last_updated=text(ic.time())
        )
    ]

    for benchmark in benchmarks:
        performance_benchmarks_storage.insert(benchmark.metric_name, benchmark)

canister_init()