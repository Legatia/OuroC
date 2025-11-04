// Agent coordinator module for distributed task execution
// Manages agent registration, task assignment, and fallback logic

use crate::state::{AGENTS, AGENT_TASKS, PENDING_TASK_QUEUE};
use crate::types::*;
use crate::subscription_manager;
use ic_cdk::api::time;

/// Create an agent task from a subscription
pub fn create_agent_task_from_subscription(subscription: &Subscription) -> AgentTask {
    let task_id = format!("task_{}_{}", subscription.id, time());

    AgentTask {
        id: task_id,
        subscription_id: subscription.id.clone(),
        chain: "solana".to_string(), // Currently only Solana, can add Arc later
        next_execution_time: subscription.next_execution,
        status: AgentTaskStatus::Pending,
        assigned_agent: None,
        created_at: time(),
        retry_count: 0,
        max_retries: AGENT_MAX_RETRIES,
        last_error: None,
    }
}

/// Register a new agent
pub fn register_agent(agent_id: String, url: Option<String>, capacity: u32) -> Result<(), String> {
    AGENTS.with(|agents| {
        if agents.borrow().contains_key(&agent_id) {
            return Err(format!("Agent {} already registered", agent_id));
        }

        let agent = Agent {
            id: agent_id.clone(),
            url,
            last_heartbeat: time(),
            is_healthy: true,
            capacity,
            current_load: 0,
            success_count: 0,
            failure_count: 0,
            registered_at: time(),
        };

        agents.borrow_mut().insert(agent_id.clone(), agent);
        ic_cdk::println!("Agent {} registered with capacity {}", agent_id, capacity);
        Ok(())
    })
}

/// Update agent heartbeat
pub fn agent_heartbeat(agent_id: String) -> Result<(), String> {
    AGENTS.with(|agents| {
        if let Some(agent) = agents.borrow_mut().get_mut(&agent_id) {
            agent.last_heartbeat = time();
            agent.is_healthy = true;
            Ok(())
        } else {
            Err(format!("Agent {} not found", agent_id))
        }
    })
}

/// Get all pending tasks ready for execution
pub fn get_all_pending_tasks(agent_id: String) -> Vec<AgentTask> {
    // Verify agent exists and is healthy
    let agent_ok = AGENTS.with(|agents| {
        agents.borrow().get(&agent_id).map_or(false, |a| a.is_healthy)
    });

    if !agent_ok {
        ic_cdk::println!("Agent {} not healthy or not found", agent_id);
        return vec![];
    }

    let now = time();

    AGENT_TASKS.with(|tasks| {
        let mut pending_tasks: Vec<AgentTask> = tasks.borrow()
            .values()
            .filter(|t| {
                matches!(t.status, AgentTaskStatus::Pending)
                && t.next_execution_time <= now
            })
            .cloned()
            .collect();

        // Mark tasks as assigned to this agent
        let mut tasks_map = tasks.borrow_mut();
        for task in &mut pending_tasks {
            if let Some(t) = tasks_map.get_mut(&task.id) {
                t.status = AgentTaskStatus::Assigned;
                t.assigned_agent = Some(agent_id.clone());
            }
        }

        // Update agent load
        AGENTS.with(|agents| {
            if let Some(agent) = agents.borrow_mut().get_mut(&agent_id) {
                agent.current_load = pending_tasks.len() as u32;
            }
        });

        ic_cdk::println!("Agent {} assigned {} tasks", agent_id, pending_tasks.len());
        pending_tasks
    })
}

/// Report task completion (single task)
pub fn report_task_completion(
    agent_id: String,
    task_id: String,
    success: bool,
    error: Option<String>
) -> Result<(), String> {
    AGENT_TASKS.with(|tasks| {
        AGENTS.with(|agents| {
            let mut tasks_map = tasks.borrow_mut();
            let task = tasks_map.get_mut(&task_id)
                .ok_or_else(|| format!("Task {} not found", task_id))?;

            // Verify agent owns this task
            if task.assigned_agent.as_ref() != Some(&agent_id) {
                return Err(format!("Task {} not assigned to agent {}", task_id, agent_id));
            }

            // Update agent stats and load
            if let Some(agent) = agents.borrow_mut().get_mut(&agent_id) {
                agent.current_load = agent.current_load.saturating_sub(1);
                if success {
                    agent.success_count += 1;
                } else {
                    agent.failure_count += 1;
                }
            }

            if success {
                task.status = AgentTaskStatus::Completed;
                ic_cdk::println!("Task {} completed successfully by agent {}", task_id, agent_id);
                Ok(())
            } else {
                task.retry_count += 1;
                task.last_error = error.clone();

                if task.retry_count >= task.max_retries {
                    task.status = AgentTaskStatus::Failed;
                    ic_cdk::println!("Task {} failed after {} retries: {:?}", task_id, task.retry_count, error);
                    // Will be caught by fallback watchdog
                } else {
                    // Re-queue for another agent
                    task.status = AgentTaskStatus::Pending;
                    task.assigned_agent = None;
                    PENDING_TASK_QUEUE.with(|queue| {
                        queue.borrow_mut().push_back(task_id.clone());
                    });
                    ic_cdk::println!("Task {} re-queued for retry {}/{}", task_id, task.retry_count, task.max_retries);
                }

                Ok(())
            }
        })
    })
}

/// Report batch completion (multiple tasks)
pub fn report_batch_completion(
    agent_id: String,
    results: Vec<(String, bool, Option<String>)>, // (task_id, success, error)
) -> Result<(), String> {
    for (task_id, success, error) in results {
        report_task_completion(agent_id.clone(), task_id, success, error)?;
    }
    Ok(())
}

/// Watchdog: Check for stale agent tasks and fallback to IC timer
pub fn check_stale_agent_tasks() {
    let now = time();
    let timeout_nanos = AGENT_TIMEOUT_HOURS * 3600 * 1_000_000_000;

    AGENT_TASKS.with(|tasks| {
        let mut tasks_to_fallback = Vec::new();

        for (task_id, task) in tasks.borrow().iter() {
            // If task is pending/assigned and overdue by timeout threshold, fallback
            let is_overdue = now > task.next_execution_time + timeout_nanos;
            let is_stuck = matches!(task.status, AgentTaskStatus::Pending | AgentTaskStatus::Assigned | AgentTaskStatus::Failed);

            if is_overdue && is_stuck {
                tasks_to_fallback.push((task_id.clone(), task.subscription_id.clone()));
            }
        }

        // Fallback to IC timer for stuck tasks
        for (task_id, subscription_id) in tasks_to_fallback {
            ic_cdk::println!("Task {} overdue by {}h, falling back to IC timer", task_id, AGENT_TIMEOUT_HOURS);

            // Mark task as falling back
            if let Some(task) = tasks.borrow_mut().get_mut(&task_id) {
                task.status = AgentTaskStatus::FallingBack;
            }

            // Trigger via IC timer (spawn async)
            ic_cdk::spawn(async move {
                subscription_manager::trigger_subscription(subscription_id.clone()).await;
                ic_cdk::println!("Fallback trigger executed for subscription {}", subscription_id);
            });
        }
    });
}

/// Get agent status for monitoring
pub fn get_agent_status() -> Vec<Agent> {
    AGENTS.with(|agents| {
        agents.borrow().values().cloned().collect()
    })
}

/// Get all agent tasks for monitoring
pub fn get_all_agent_tasks() -> Vec<AgentTask> {
    AGENT_TASKS.with(|tasks| {
        tasks.borrow().values().cloned().collect()
    })
}

/// Clean up completed tasks (called periodically)
pub fn cleanup_completed_tasks() {
    let now = time();
    let one_day_nanos = 24 * 3600 * 1_000_000_000;

    AGENT_TASKS.with(|tasks| {
        let mut tasks_map = tasks.borrow_mut();
        tasks_map.retain(|_, task| {
            // Keep tasks that are:
            // - Not completed OR
            // - Completed within last 24 hours (for audit trail)
            !matches!(task.status, AgentTaskStatus::Completed)
            || now - task.created_at < one_day_nanos
        });
    });
}
