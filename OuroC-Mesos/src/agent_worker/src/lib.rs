// Agent Worker Canister
// Polls timer_rust canister every 12 hours for pending tasks and executes them

use candid::{CandidType, Deserialize, Principal};
use ic_cdk::{
    api::{call::call, time},
    export_candid,
    init, query, update,
};
use ic_cdk_timers::{set_timer_interval, set_timer};
use std::time::Duration;

// Configuration
const TIMER_CANISTER_ID: &str = "uzt4z-lp777-77774-qaabq-cai"; // timer_rust canister ID
const AGENT_ID: &str = "agent-ic-01";
const POLL_INTERVAL_HOURS: u64 = 12;
const AGENT_CAPACITY: u32 = 1000; // High capacity since we batch

// Agent task types (must match timer_rust)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum AgentTaskStatus {
    Pending,
    Assigned,
    InProgress,
    Completed,
    Failed,
    FallingBack,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AgentTask {
    pub id: String,
    pub subscription_id: String,
    pub chain: String,
    pub next_execution_time: u64,
    pub status: AgentTaskStatus,
    pub assigned_agent: Option<String>,
    pub created_at: u64,
    pub retry_count: u32,
    pub max_retries: u32,
    pub last_error: Option<String>,
}

// State
thread_local! {
    static TIMER_CANISTER: std::cell::RefCell<Option<Principal>> = std::cell::RefCell::new(None);
    static LAST_POLL_TIME: std::cell::RefCell<u64> = std::cell::RefCell::new(0);
    static TOTAL_TASKS_PROCESSED: std::cell::RefCell<u64> = std::cell::RefCell::new(0);
    static TOTAL_SUCCESSES: std::cell::RefCell<u64> = std::cell::RefCell::new(0);
    static TOTAL_FAILURES: std::cell::RefCell<u64> = std::cell::RefCell::new(0);
}

#[init]
fn init() {
    ic_cdk::println!("🤖 Agent Worker initializing...");

    // Parse and store timer canister principal
    match Principal::from_text(TIMER_CANISTER_ID) {
        Ok(principal) => {
            TIMER_CANISTER.with(|c| *c.borrow_mut() = Some(principal));
            ic_cdk::println!("Timer canister set to: {}", TIMER_CANISTER_ID);
        }
        Err(e) => {
            ic_cdk::println!("⚠️  Failed to parse timer canister ID: {:?}", e);
        }
    }

    // Schedule 12-hour polling
    let interval_seconds = POLL_INTERVAL_HOURS * 3600;
    set_timer_interval(Duration::from_secs(interval_seconds), || {
        ic_cdk::println!("⏰ 12-hour timer triggered, starting poll cycle...");
        ic_cdk::spawn(poll_and_execute_batch());
    });

    // Register with timer canister after init completes (use one-time timer)
    set_timer(Duration::from_secs(1), || {
        ic_cdk::spawn(async {
            if let Err(e) = register_agent().await {
                ic_cdk::println!("⚠️  Agent registration failed: {}", e);
            } else {
                ic_cdk::println!("✅ Agent registered successfully");
            }
        });
    });

    ic_cdk::println!("✅ Agent Worker initialized - will poll every {} hours", POLL_INTERVAL_HOURS);
}

/// Register this agent with timer_rust canister
async fn register_agent() -> Result<(), String> {
    let timer_canister = TIMER_CANISTER.with(|c| *c.borrow())
        .ok_or("Timer canister not configured")?;

    let result: Result<(Result<String, String>,), _> = call(
        timer_canister,
        "register_agent",
        (AGENT_ID.to_string(), AGENT_CAPACITY),
    ).await;

    match result {
        Ok((Ok(msg),)) => {
            ic_cdk::println!("Agent registration: {}", msg);
            Ok(())
        }
        Ok((Err(e),)) => Err(format!("Registration rejected: {}", e)),
        Err((code, msg)) => Err(format!("Registration call failed: {:?} - {}", code, msg)),
    }
}

/// Main polling and execution loop
async fn poll_and_execute_batch() {
    let start_time = time();
    LAST_POLL_TIME.with(|t| *t.borrow_mut() = start_time);

    ic_cdk::println!("🔄 Starting 12-hour poll cycle at {}", start_time);

    let timer_canister = match TIMER_CANISTER.with(|c| *c.borrow()) {
        Some(p) => p,
        None => {
            ic_cdk::println!("❌ Timer canister not configured");
            return;
        }
    };

    // Step 1: Heartbeat
    ic_cdk::println!("💓 Sending heartbeat...");
    let heartbeat_result: Result<(Result<(), String>,), _> = call(
        timer_canister,
        "agent_heartbeat",
        (AGENT_ID.to_string(),),
    ).await;

    if let Err(e) = heartbeat_result {
        ic_cdk::println!("⚠️  Heartbeat failed: {:?}", e);
    }

    // Step 2: Get all pending tasks
    ic_cdk::println!("📥 Fetching pending tasks...");
    let tasks_result: Result<(Vec<AgentTask>,), _> = call(
        timer_canister,
        "get_all_pending_tasks",
        (AGENT_ID.to_string(),),
    ).await;

    let tasks = match tasks_result {
        Ok((tasks,)) => tasks,
        Err((code, msg)) => {
            ic_cdk::println!("❌ Failed to fetch tasks: {:?} - {}", code, msg);
            return;
        }
    };

    ic_cdk::println!("📋 Retrieved {} pending tasks", tasks.len());

    if tasks.is_empty() {
        ic_cdk::println!("✅ No tasks to process");
        return;
    }

    // Step 3: Execute tasks one by one
    let mut results = Vec::new();
    let mut success_count = 0u64;
    let mut failure_count = 0u64;

    for task in tasks {
        ic_cdk::println!("⚙️  Executing task: {} for subscription: {}", task.id, task.subscription_id);

        let result = execute_task(&task, timer_canister).await;

        match &result {
            Ok(_) => {
                ic_cdk::println!("✅ Task {} completed successfully", task.id);
                success_count += 1;
                results.push((task.id.clone(), true, None));
            }
            Err(e) => {
                ic_cdk::println!("❌ Task {} failed: {}", task.id, e);
                failure_count += 1;
                results.push((task.id.clone(), false, Some(e.clone())));
            }
        }
    }

    // Step 4: Report all results in batch
    ic_cdk::println!("📤 Reporting batch results: {} success, {} failures", success_count, failure_count);

    let report_result: Result<(Result<(), String>,), _> = call(
        timer_canister,
        "report_batch_completion",
        (AGENT_ID.to_string(), results),
    ).await;

    match report_result {
        Ok((Ok(()),)) => {
            ic_cdk::println!("✅ Batch results reported successfully");
        }
        Ok((Err(e),)) => {
            ic_cdk::println!("⚠️  Failed to report results: {}", e);
        }
        Err((code, msg)) => {
            ic_cdk::println!("❌ Report call failed: {:?} - {}", code, msg);
        }
    }

    // Update stats
    TOTAL_TASKS_PROCESSED.with(|c| *c.borrow_mut() += (success_count + failure_count));
    TOTAL_SUCCESSES.with(|c| *c.borrow_mut() += success_count);
    TOTAL_FAILURES.with(|c| *c.borrow_mut() += failure_count);

    let duration = (time() - start_time) / 1_000_000_000; // Convert to seconds
    ic_cdk::println!("🏁 Poll cycle complete in {}s", duration);
}

/// Execute a single task (trigger subscription payment)
async fn execute_task(task: &AgentTask, timer_canister: Principal) -> Result<String, String> {
    ic_cdk::println!("Triggering subscription: {}", task.subscription_id);

    // Call timer_rust's trigger_subscription function
    let result: Result<(Result<String, String>,), _> = call(
        timer_canister,
        "trigger_subscription",
        (task.subscription_id.clone(),),
    ).await;

    match result {
        Ok((Ok(tx_hash),)) => {
            ic_cdk::println!("Transaction successful: {}", tx_hash);
            Ok(tx_hash)
        }
        Ok((Err(e),)) => {
            Err(format!("Trigger failed: {}", e))
        }
        Err((code, msg)) => {
            Err(format!("Call failed: {:?} - {}", code, msg))
        }
    }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/// Manually trigger a poll cycle (for testing/debugging)
#[update]
async fn manual_poll() -> String {
    ic_cdk::println!("🔧 Manual poll triggered by caller");
    poll_and_execute_batch().await;
    "Manual poll cycle started".to_string()
}

/// Get agent status and statistics
#[query]
fn get_agent_info() -> (String, String, u64, u64, u64, u64) {
    let last_poll = LAST_POLL_TIME.with(|t| *t.borrow());
    let total_processed = TOTAL_TASKS_PROCESSED.with(|c| *c.borrow());
    let total_success = TOTAL_SUCCESSES.with(|c| *c.borrow());
    let total_failure = TOTAL_FAILURES.with(|c| *c.borrow());

    (
        AGENT_ID.to_string(),
        TIMER_CANISTER_ID.to_string(),
        last_poll,
        total_processed,
        total_success,
        total_failure,
    )
}

/// Update timer canister ID (admin function)
#[update]
fn set_timer_canister(canister_id: String) -> Result<String, String> {
    match Principal::from_text(&canister_id) {
        Ok(principal) => {
            TIMER_CANISTER.with(|c| *c.borrow_mut() = Some(principal));
            Ok(format!("Timer canister updated to: {}", canister_id))
        }
        Err(e) => Err(format!("Invalid principal: {:?}", e)),
    }
}

/// Health check
#[query]
fn ping() -> String {
    format!("Agent {} is alive! Last poll: {}", AGENT_ID,
        LAST_POLL_TIME.with(|t| *t.borrow()))
}

// Export Candid interface
export_candid!();
