// Authorization module for role-based access control

use ic_cdk::caller;
use std::collections::HashSet;

thread_local! {
    static ADMIN_LIST: std::cell::RefCell<HashSet<String>> = std::cell::RefCell::new(HashSet::new());
    static READ_ONLY_USERS: std::cell::RefCell<HashSet<String>> = std::cell::RefCell::new(HashSet::new());
}

pub fn require_admin() -> Result<(), String> {
    let caller_str = caller().to_string();
    if ADMIN_LIST.with(|admins| admins.borrow().contains(&caller_str)) {
        Ok(())
    } else {
        Err("Unauthorized: Admin access required".to_string())
    }
}

pub fn require_read_access() -> Result<(), String> {
    let caller_str = caller().to_string();
    if ADMIN_LIST.with(|admins| admins.borrow().contains(&caller_str)) {
        Ok(())
    } else if READ_ONLY_USERS.with(|users| users.borrow().contains(&caller_str)) {
        Ok(())
    } else {
        Err("Unauthorized: Read access required".to_string())
    }
}

pub async fn add_admin(new_admin: String) -> Result<(), String> {
    let caller_str = caller().to_string();

    // Initialize first admin if none exist
    if ADMIN_LIST.with(|admins| admins.borrow().is_empty()) {
        ADMIN_LIST.with(|admins| admins.borrow_mut().insert(caller_str.clone()));
    }

    if !require_admin().is_ok() {
        return Err("Unauthorized: Only admins can add other admins".to_string());
    }

    ADMIN_LIST.with(|admins| {
        let mut admins = admins.borrow_mut();
        if !admins.contains(&new_admin) {
            admins.insert(new_admin.clone());
            ic_cdk::println!("➕ Admin added: {} added {}", caller_str, new_admin);
            Ok(())
        } else {
            Err("Principal is already an admin".to_string())
        }
    })
}

pub async fn remove_admin(admin_to_remove: String) -> Result<(), String> {
    require_admin()?;

    let caller_str = caller().to_string();
    if caller_str == admin_to_remove {
        return Err("Cannot remove yourself as admin".to_string());
    }

    ADMIN_LIST.with(|admins| {
        let mut admins = admins.borrow_mut();
        if admins.len() <= 1 {
            return Err("Cannot remove the last admin".to_string());
        }

        if admins.remove(&admin_to_remove) {
            ic_cdk::println!("➖ Admin removed: {} removed {}", caller_str, admin_to_remove);
            Ok(())
        } else {
            Err("Principal is not an admin".to_string())
        }
    })
}

pub async fn add_read_only_user(user: String) -> Result<(), String> {
    require_admin()?;

    READ_ONLY_USERS.with(|users| {
        let mut users = users.borrow_mut();
        if !users.contains(&user) {
            users.insert(user.clone());
            Ok(())
        } else {
            Err("User already has read access".to_string())
        }
    })
}

pub async fn remove_read_only_user(user: String) -> Result<(), String> {
    require_admin()?;

    READ_ONLY_USERS.with(|users| {
        let mut users = users.borrow_mut();
        if users.remove(&user) {
            Ok(())
        } else {
            Err("User does not have read access".to_string())
        }
    })
}

pub async fn get_admins() -> Result<Vec<String>, String> {
    require_admin()?;
    Ok(ADMIN_LIST.with(|admins| admins.borrow().iter().cloned().collect()))
}

pub async fn get_read_only_users() -> Result<Vec<String>, String> {
    require_admin()?;
    Ok(READ_ONLY_USERS.with(|users| users.borrow().iter().cloned().collect()))
}

pub async fn initialize_first_admin() -> Result<(), String> {
    let caller_str = caller().to_string();
    ADMIN_LIST.with(|admins| {
        if admins.borrow().is_empty() {
            admins.borrow_mut().insert(caller_str.clone());
            ic_cdk::println!("🔑 First admin initialized: {}", caller_str);
            Ok(())
        } else {
            Err("Admin already initialized".to_string())
        }
    })
}

pub async fn add_controller_admin(new_admin: String) -> Result<(), String> {
    let caller_str = caller().to_string();
    let canister_principal = ic_cdk::api::id().to_string();

    ADMIN_LIST.with(|admins| {
        let mut admins = admins.borrow_mut();

        if admins.is_empty() {
            admins.insert(new_admin.clone());
            ic_cdk::println!("🔑 Initialized first admin: {}", new_admin);
            return Ok(());
        }

        if admins.len() == 1 && admins.contains(&canister_principal) {
            admins.remove(&canister_principal);
            admins.insert(new_admin.clone());
            ic_cdk::println!("🔄 Replaced canister admin with human admin: {}", new_admin);
            return Ok(());
        }

        if admins.contains(&caller_str) {
            if !admins.contains(&new_admin) {
                admins.insert(new_admin);
                Ok(())
            } else {
                Err("Principal is already an admin".to_string())
            }
        } else {
            Err("This function can only be used when canister is the sole admin or admin list is empty".to_string())
        }
    })
}

pub async fn debug_admin_info() -> String {
    let _caller_str = caller().to_string();
    let canister_principal = ic_cdk::api::id().to_string();

    let admins = ADMIN_LIST.with(|admins| admins.borrow().iter().cloned().collect::<Vec<_>>());
    let mut info = format!("Admin count: {}\n", admins.len());
    info += &format!("Canister principal: {}\n", canister_principal);
    info += "Admins:\n";
    for admin in &admins {
        info += &format!("  - {}", admin);
        if admin == &canister_principal {
            info += " (CANISTER ITSELF - WRONG!)";
        }
        info += "\n";
    }
    info
}

// For stable storage
pub fn get_admin_list() -> Vec<String> {
    ADMIN_LIST.with(|admins| admins.borrow().iter().cloned().collect())
}

pub fn get_read_only_users_list() -> Vec<String> {
    READ_ONLY_USERS.with(|users| users.borrow().iter().cloned().collect())
}

pub fn restore_admins(admins: Vec<String>, read_only: Vec<String>) {
    ADMIN_LIST.with(|a| *a.borrow_mut() = admins.into_iter().collect());
    READ_ONLY_USERS.with(|r| *r.borrow_mut() = read_only.into_iter().collect());
}

pub fn is_admin(caller: &str) -> bool {
    ADMIN_LIST.with(|admins| admins.borrow().contains(&caller.to_string()))
}

pub fn has_read_access(caller: &str) -> bool {
    let caller_str = caller.to_string();
    if ADMIN_LIST.with(|admins| admins.borrow().contains(&caller_str)) {
        return true;
    }
    READ_ONLY_USERS.with(|users| users.borrow().contains(&caller_str))
}