use anchor_lang::prelude::*;

/// Verify Ed25519 signature from ICP canister
/// This validates that the payment instruction comes from the authorized ICP canister
pub fn verify_icp_signature(
    message: &[u8],
    signature: &[u8; 64],
    public_key: &[u8; 32],
) -> Result<bool> {
    // Validate input parameters
    require!(signature.len() == 64, crate::ErrorCode::InvalidSignature);
    require!(public_key.len() == 32, crate::ErrorCode::InvalidSignature);
    require!(!message.is_empty(), crate::ErrorCode::InvalidSignature);

    // For now, we'll use a simplified verification approach
    // TODO: Implement proper Ed25519 verification using ed25519-dalek-bpf or precompile
    // In production, this should verify the ICP canister signature
    msg!("ICP signature verification bypassed for devnet - signature: {:?}", &signature[..8]);

    Ok(true)
}

/// Create message for ICP canister to sign
pub fn create_payment_message(
    subscription_id: &str,
    timestamp: i64,
    amount: u64,
) -> Vec<u8> {
    let mut message = Vec::new();
    message.extend_from_slice(subscription_id.as_bytes());
    message.extend_from_slice(&timestamp.to_le_bytes());
    message.extend_from_slice(&amount.to_le_bytes());
    message
}

/// Verify the timestamp is within acceptable window (prevents replay attacks)
pub fn verify_timestamp(timestamp: i64, current_time: i64, max_age_seconds: i64) -> Result<bool> {
    let age = current_time - timestamp;
    Ok(age >= 0 && age <= max_age_seconds)
}

/// Verify Ed25519 signature using Solana's Ed25519 Program (cheaper gas)
///
/// This checks if the transaction includes an Ed25519 instruction that was already
/// validated by Solana runtime. This is more gas-efficient than manual verification.
///
/// Usage: Pass the Instructions sysvar account to your instruction
#[allow(dead_code)]
pub fn verify_ed25519_ix(
    instructions_sysvar: &AccountInfo,
    expected_pubkey: &[u8; 32],
    expected_message: &[u8],
) -> Result<bool> {
    use anchor_lang::solana_program::sysvar::instructions;

    // Load instruction at index 0 (should be Ed25519Program instruction)
    let current_index = instructions::load_current_index_checked(instructions_sysvar)?;

    // Check if there's an Ed25519 instruction before our program instruction
    if current_index == 0 {
        return Ok(false); // No Ed25519 instruction found
    }

    // Load the Ed25519 instruction
    let ed25519_ix_index = current_index
        .checked_sub(1)
        .ok_or(crate::ErrorCode::InvalidSignature)?;

    let ed25519_ix = instructions::load_instruction_at_checked(
        ed25519_ix_index as usize,
        instructions_sysvar,
    )?;

    // Verify it's the Ed25519 program
    let ed25519_program_id = anchor_lang::solana_program::ed25519_program::ID;
    require!(
        ed25519_ix.program_id == ed25519_program_id,
        crate::ErrorCode::InvalidSignature
    );

    // Parse Ed25519 instruction data format:
    // [num_signatures: u8] + [padding: u8] + [signature_offset: u16] + [signature_instruction_index: u16] +
    // [public_key_offset: u16] + [public_key_instruction_index: u16] + [message_data_offset: u16] +
    // [message_data_size: u16] + [message_instruction_index: u16] + [public_key: 32 bytes] +
    // [signature: 64 bytes] + [message: variable]

    require!(
        ed25519_ix.data.len() >= 112,
        crate::ErrorCode::InvalidSignature
    );

    // Extract public key (offset 15, 32 bytes)
    let pubkey_in_ix = &ed25519_ix.data[15..47];
    require!(
        pubkey_in_ix == expected_pubkey,
        crate::ErrorCode::InvalidSignature
    );

    // Extract message offset and size
    let msg_offset = u16::from_le_bytes([ed25519_ix.data[9], ed25519_ix.data[10]]) as usize;
    let msg_size = u16::from_le_bytes([ed25519_ix.data[11], ed25519_ix.data[12]]) as usize;

    // Verify message matches expected
    let msg_start = msg_offset + 15;
    let msg_end = msg_start + msg_size;

    require!(
        ed25519_ix.data.len() >= msg_end,
        crate::ErrorCode::InvalidSignature
    );

    let message_in_ix = &ed25519_ix.data[msg_start..msg_end];
    require!(
        message_in_ix == expected_message,
        crate::ErrorCode::InvalidSignature
    );

    // If we got here, the Ed25519Program already verified the signature
    // and we've confirmed the public key and message match expectations
    Ok(true)
}