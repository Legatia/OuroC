// Cycle management module for monitoring and refilling canister cycles

use crate::*;
use ic_cdk::api::canister_balance;
use anyhow::{Result, anyhow};

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct CycleBalance {
    pub balance: u64,
    pub last_updated: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct CycleReport {
    pub current_balance: u64,
    pub threshold_balance: u64,
    pub auto_refill_enabled: bool,
    pub last_refill: Option<u64>,
    pub total_consumed: u64,
    pub total_refilled: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct FeeDistribution {
    pub solana_lamports_collected: u64,
    pub cycles_purchased: u64,
    pub conversion_rate: f64, // lamports per cycle
    pub distribution_timestamp: u64,
}

pub struct CycleManager {
    threshold: u64,
    auto_refill_enabled: bool,
    total_consumed: u64,
    total_refilled: u64,
    last_refill_time: Option<u64>,
    fee_distributions: Vec<FeeDistribution>,
}

impl CycleManager {
    pub fn new(initial_threshold: u64, auto_refill_enabled: bool) -> Self {
        Self {
            threshold: initial_threshold,
            auto_refill_enabled,
            total_consumed: 0,
            total_refilled: 0,
            last_refill_time: None,
            fee_distributions: Vec::new(),
        }
    }

    pub fn get_cycle_balance(&self) -> u64 {
        canister_balance()
    }

    pub fn check_cycle_status(&self) -> CycleReport {
        let current = self.get_cycle_balance();
        CycleReport {
            current_balance: current,
            threshold_balance: self.threshold,
            auto_refill_enabled: self.auto_refill_enabled,
            last_refill: self.last_refill_time,
            total_consumed: self.total_consumed,
            total_refilled: self.total_refilled,
        }
    }

    pub fn set_cycle_threshold(&mut self, new_threshold: u64) {
        self.threshold = new_threshold;
        ic_cdk::print(&format!("Cycle threshold updated to: {}", new_threshold));
    }

    pub fn enable_auto_refill(&mut self, enabled: bool) {
        self.auto_refill_enabled = enabled;
        ic_cdk::print(&format!("Auto-refill {}", if enabled { "enabled" } else { "disabled" }));
    }

    pub fn needs_refill(&self) -> bool {
        self.get_cycle_balance() < self.threshold
    }

    // Convert Solana lamports to ICP cycles and refill
    pub async fn refill_from_solana_fees(
        &mut self,
        lamports_amount: u64,
        conversion_rate: f64, // lamports per cycle
    ) -> Result<u64, String> {
        let cycles_to_add = (lamports_amount as f64 / conversion_rate) as u64;

        if cycles_to_add < 1_000_000_000 {
            return Err("Insufficient lamports for meaningful cycle refill".to_string());
        }

        // In a real implementation, this would:
        // 1. Convert SOL to ICP on a DEX or exchange
        // 2. Use the ICP to purchase cycles
        // For now, we simulate the cycle addition

        ic_cdk::print(&format!("💰 Simulating cycle refill: {} cycles from {} lamports",
                              cycles_to_add, lamports_amount));

        // Record the fee distribution
        let distribution = FeeDistribution {
            solana_lamports_collected: lamports_amount,
            cycles_purchased: cycles_to_add,
            conversion_rate,
            distribution_timestamp: ic_cdk::api::time(),
        };

        self.fee_distributions.push(distribution);
        self.total_refilled += cycles_to_add;
        self.last_refill_time = Some(ic_cdk::api::time());

        Ok(cycles_to_add)
    }

    // Monitor and auto-refill if needed
    pub async fn monitor_and_refill(
        &mut self,
        available_lamports: u64,
        conversion_rate: f64,
    ) -> Result<bool, String> {
        if !self.auto_refill_enabled {
            return Ok(false);
        }

        if !self.needs_refill() {
            return Ok(false);
        }

        ic_cdk::print(&format!("🔄 Auto-refill triggered - current balance: {}, threshold: {}",
                              self.get_cycle_balance(), self.threshold));

        match self.refill_from_solana_fees(available_lamports, conversion_rate).await {
            Ok(cycles_added) => {
                ic_cdk::print(&format!("✅ Auto-refill successful: {} cycles added", cycles_added));
                Ok(true)
            }
            Err(error) => {
                ic_cdk::print(&format!("❌ Auto-refill failed: {}", error));
                Err(error)
            }
        }
    }

    // Record cycle consumption for tracking
    pub fn record_consumption(&mut self, amount: u64) {
        self.total_consumed += amount;
    }

    // Get fee distribution history
    pub fn get_fee_distributions(&self) -> &[FeeDistribution] {
        &self.fee_distributions
    }

    // Calculate optimal fee collection timing
    pub fn should_collect_fees(&self, current_lamports: u64, conversion_rate: f64) -> bool {
        if !self.needs_refill() {
            return false;
        }

        let potential_cycles = (current_lamports as f64 / conversion_rate) as u64;
        potential_cycles > 1_000_000_000 // Worth at least 1B cycles
    }

    // Emergency cycle status check
    pub fn is_emergency_low(&self) -> bool {
        self.get_cycle_balance() < (self.threshold / 10) // Less than 10% of threshold
    }

    // Get cycle consumption rate (cycles per second)
    pub fn get_consumption_rate(&self) -> Option<f64> {
        self.last_refill_time.map(|last_refill| {
            let time_elapsed = ic_cdk::api::time() - last_refill;
            if time_elapsed > 0 {
                let seconds_elapsed = time_elapsed as f64 / 1_000_000_000.0;
                self.total_consumed as f64 / seconds_elapsed
            } else {
                0.0
            }
        })
    }

    // Estimate time until cycle depletion
    pub fn estimate_depletion_time(&self) -> Option<u64> {
        self.get_consumption_rate().map(|rate| {
            if rate > 0.0 {
                let current_balance = self.get_cycle_balance() as f64;
                let seconds_remaining = current_balance / rate;
                let nanos_remaining = (seconds_remaining * 1_000_000_000.0) as u64;
                ic_cdk::api::time() + nanos_remaining
            } else {
                u64::MAX // Far future
            }
        })
    }

    // Get total cycles managed
    pub fn get_total_cycles_managed(&self) -> u64 {
        self.total_consumed + self.total_refilled
    }

    // Get efficiency ratio (cycles used vs cycles refilled)
    pub fn get_efficiency_ratio(&self) -> f64 {
        if self.total_refilled > 0 {
            self.total_consumed as f64 / self.total_refilled as f64
        } else {
            0.0
        }
    }

    // Get average refill amount
    pub fn get_average_refill(&self) -> f64 {
        if self.fee_distributions.is_empty() {
            0.0
        } else {
            self.total_refilled as f64 / self.fee_distributions.len() as f64
        }
    }

    // Reset counters (for maintenance)
    pub fn reset_counters(&mut self) {
        self.total_consumed = 0;
        self.total_refilled = 0;
        self.fee_distributions.clear();
        self.last_refill_time = None;
        ic_cdk::print("📊 Cycle counters reset");
    }
}

// Utility functions for price oracle and conversion

pub async fn lamports_to_icp_estimate(lamports: u64) -> Result<f64, String> {
    // Get real SOL/ICP exchange rate from price oracle
    match get_sol_price_usd().await {
        Ok(sol_usd) => {
            match get_icp_price_usd().await {
                Ok(icp_usd) => {
                    let sol_amount = lamports as f64 / 1_000_000_000.0;
                    let exchange_rate = sol_usd / icp_usd;
                    Ok(sol_amount * exchange_rate)
                }
                Err(e) => Err(format!("Failed to get ICP price: {}", e)),
            }
        }
        Err(e) => Err(format!("Failed to get SOL price: {}", e)),
    }
}

async fn get_sol_price_usd() -> Result<f64, String> {
    // Get SOL price from CoinGecko API
    let url = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
    fetch_price_from_api(url, "solana").await
}

async fn get_icp_price_usd() -> Result<f64, String> {
    // Get ICP price from CoinGecko API
    let url = "https://api.coingecko.com/api/v3/simple/price?ids=internet-computer&vs_currencies=usd";
    fetch_price_from_api(url, "internet-computer").await
}

async fn fetch_price_from_api(url: &str, coin_id: &str) -> Result<f64, String> {
    // TODO: Implement HTTP outcall for price oracle
    // For now, return mock prices for testing
    ic_cdk::print(&format!("📊 Mock price API call for: {}", coin_id));

    match coin_id {
        "solana" => Ok(150.0), // Mock SOL price in USD
        "internet-computer" => Ok(15.0), // Mock ICP price in USD
        _ => Err("Unknown coin ID".to_string()),
    }
}

pub fn icp_to_cycles_estimate(icp: f64) -> u64 {
    // 1 ICP ≈ 1T cycles (rough estimate)
    (icp * 1_000_000_000_000.0) as u64
}

pub fn calculate_conversion_rate(sol_price_usd: f64, icp_price_usd: f64) -> f64 {
    // Returns lamports per cycle
    if icp_price_usd <= 0.0 {
        1.0 // Fallback rate
    } else {
        let sol_per_icp = sol_price_usd / icp_price_usd;
        let lamports_per_icp = sol_per_icp * 1_000_000_000.0;
        let cycles_per_icp = 1_000_000_000_000.0; // 1T cycles per ICP
        lamports_per_icp / cycles_per_icp
    }
}

// Thread-local cycle manager instance
thread_local! {
    static CYCLE_MANAGER: std::cell::RefCell<CycleManager> = std::cell::RefCell::new(
        CycleManager::new(5_000_000_000_000, true) // 5T cycles threshold, auto-refill enabled
    );
}

// Public functions for cycle management

pub fn init_cycle_manager(threshold: u64, auto_refill: bool) {
    CYCLE_MANAGER.with(|cm| {
        *cm.borrow_mut() = CycleManager::new(threshold, auto_refill);
    });
}

#[query]
pub fn get_cycle_status() -> CycleReport {
    CYCLE_MANAGER.with(|cm| cm.borrow().check_cycle_status())
}

#[update]
pub fn set_cycle_threshold(new_threshold: u64) {
    CYCLE_MANAGER.with(|cm| {
        cm.borrow_mut().set_cycle_threshold(new_threshold);
    });
    // Also update the global threshold
    crate::CYCLE_THRESHOLD.with(|t| *t.borrow_mut() = new_threshold);
}

#[update]
pub fn enable_auto_refill(enabled: bool) {
    CYCLE_MANAGER.with(|cm| {
        cm.borrow_mut().enable_auto_refill(enabled);
    });
    // Also update the global setting
    crate::AUTO_CYCLE_REFILL.with(|a| *a.borrow_mut() = enabled);
}

#[update]
pub async fn monitor_cycles() -> Result<bool, String> {
    // Get mock available lamports (in production, this would query actual balance)
    let available_lamports = 100_000_000; // 0.1 SOL
    let conversion_rate = calculate_conversion_rate(150.0, 15.0); // Mock prices

    CYCLE_MANAGER.with(|cm| {
        cm.borrow_mut().monitor_and_refill(available_lamports, conversion_rate).await
    })
}

#[update]
pub async fn refill_cycles_from_fees() -> Result<u64, String> {
    // Get mock fee balance (in production, this would query actual fees)
    let fee_balance = 1_000_000_000; // 1 SOL in lamports
    let conversion_rate = calculate_conversion_rate(150.0, 15.0); // Mock prices

    CYCLE_MANAGER.with(|cm| {
        cm.borrow_mut().refill_from_solana_fees(fee_balance, conversion_rate).await
    })
}

// Record cycle consumption (called by other modules)
pub fn record_consumption(amount: u64) {
    CYCLE_MANAGER.with(|cm| {
        cm.borrow_mut().record_consumption(amount);
    });
}

// Get comprehensive cycle statistics
#[query]
pub fn get_cycle_statistics() -> Result<CycleStatistics, String> {
    require_read_access()?;

    CYCLE_MANAGER.with(|cm| {
        let manager = cm.borrow();
        Ok(CycleStatistics {
            current_balance: manager.get_cycle_balance(),
            threshold_balance: manager.threshold,
            total_consumed: manager.total_consumed,
            total_refilled: manager.total_refilled,
            efficiency_ratio: manager.get_efficiency_ratio(),
            average_refill: manager.get_average_refill(),
            consumption_rate: manager.get_consumption_rate(),
            estimated_depletion_time: manager.estimate_depletion_time(),
            is_emergency_low: manager.is_emergency_low(),
            total_distributions: manager.fee_distributions.len(),
        })
    })
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct CycleStatistics {
    pub current_balance: u64,
    pub threshold_balance: u64,
    pub total_consumed: u64,
    pub total_refilled: u64,
    pub efficiency_ratio: f64,
    pub average_refill: f64,
    pub consumption_rate: Option<f64>,
    pub estimated_depletion_time: Option<u64>,
    pub is_emergency_low: bool,
    pub total_distributions: usize,
}

// Reset cycle counters (admin only)
#[update]
pub fn reset_cycle_counters() -> Result<(), String> {
    require_admin()?;
    CYCLE_MANAGER.with(|cm| {
        cm.borrow_mut().reset_counters();
    });
    Ok(())
}