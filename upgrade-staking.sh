#!/bin/bash
################################################################################
# Staking Contract Upgrade Script (v1.2.0)
# Run each step one at a time. Check output before proceeding to next step.
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

################################################################################
# CONFIGURATION
################################################################################

# Your deployer identity (already saved in stellar CLI)
SOURCE_IDENTITY="blub-issuer-v2"

# Admin address
ADMIN_ADDRESS="GDERSSCKJQPPXUQOZIOXGRVAGNLVPVZCJ2MAX7RCMVMWGRPVAEG7XGTK"

# The CURRENTLY LIVE staking contract to upgrade
STAKING_CONTRACT_ID="CC72BEVVKHQ57PB5FCKAZYRXCSR6DOQSTN46QR7RZMMM64YWNRPDS24S"

# Network
NETWORK="mainnet"

# Paths
CONTRACTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/soroban-contracts/staking-contract"
WASM_DIR="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release"

################################################################################
# STEP 1: Build the contract
################################################################################

echo ""
print_info "=========================================="
print_info "STEP 1: Build the staking contract"
print_info "=========================================="
echo ""

cd "$CONTRACTS_DIR"

# Rust 1.82+ enables reference-types for wasm32-unknown-unknown by default,
# but Soroban's VM doesn't support it. Explicitly disable it.
RUSTFLAGS="-C target-feature=-reference-types" \
    cargo build --release --target wasm32-unknown-unknown --package whalehub-staking

if [ ! -f "$WASM_DIR/whalehub_staking.wasm" ]; then
    print_error "Build failed - WASM file not found"
    exit 1
fi

WASM_SIZE=$(wc -c < "$WASM_DIR/whalehub_staking.wasm")
print_success "Built successfully ($WASM_SIZE bytes)"

echo ""
print_info "=========================================="
print_info "STEP 2: Install WASM to get hash"
print_info "=========================================="
echo ""

WASM_HASH=$(stellar contract install \
    --source "$SOURCE_IDENTITY" \
    --network "$NETWORK" \
    --fee 1500000000 \
    --wasm "$WASM_DIR/whalehub_staking.wasm")

print_success "WASM installed!"
print_success "Hash: $WASM_HASH"
echo ""

################################################################################
# STEP 3: Check current contract version (optional sanity check)
################################################################################

echo ""
print_info "=========================================="
print_info "STEP 3: Check current version"
print_info "=========================================="
echo ""

CURRENT_VERSION=$(stellar contract invoke \
    --id "$STAKING_CONTRACT_ID" \
    --network "$NETWORK" \
    -- \
    get_version 2>&1) || true

print_info "Current on-chain version: $CURRENT_VERSION"
echo ""

################################################################################
# STEP 4: Upgrade the contract
################################################################################

echo ""
print_info "=========================================="
print_info "STEP 4: Upgrade contract with new WASM"
print_info "=========================================="
print_warning "This replaces the contract code in-place."
print_warning "All storage/state is preserved."
echo ""

stellar contract invoke \
    --id "$STAKING_CONTRACT_ID" \
    --source "$SOURCE_IDENTITY" \
    --network "$NETWORK" \
    --fee 1500000000 \
    -- \
    upgrade \
    --admin "$ADMIN_ADDRESS" \
    --new_wasm_hash "$WASM_HASH"

print_success "Contract upgraded!"
echo ""

################################################################################
# STEP 5: Migrate to v1.2.0 (add cooldown fields + init RewardStateV2)
################################################################################

echo ""
print_info "=========================================="
print_info "STEP 5: Run migration to v1.2.0"
print_info "=========================================="
print_info "Adds cooldown fields and initializes Synthetix rewards."
print_info "Safe to run: returns AlreadyInitialized if already v1.2.0."
echo ""

MIGRATE_RESULT=$(stellar contract invoke \
    --id "$STAKING_CONTRACT_ID" \
    --source "$SOURCE_IDENTITY" \
    --network "$NETWORK" \
    --fee 1500000000 \
    -- \
    migrate_v1_2_0 \
    --admin "$ADMIN_ADDRESS" 2>&1) || true

echo "$MIGRATE_RESULT"

if echo "$MIGRATE_RESULT" | grep -q "AlreadyInitialized"; then
    print_info "Already on v1.2.0 - no migration needed"
else
    print_success "Migration complete!"
fi
echo ""

################################################################################
# STEP 6: Verify the upgrade
################################################################################

echo ""
print_info "=========================================="
print_info "STEP 6: Verify upgrade"
print_info "=========================================="
echo ""

NEW_VERSION=$(stellar contract invoke \
    --id "$STAKING_CONTRACT_ID" \
    --network "$NETWORK" \
    -- \
    get_version 2>&1) || true

print_info "New on-chain version: $NEW_VERSION"

# Check global state
print_info "Checking global state..."
GLOBAL_STATE=$(stellar contract invoke \
    --id "$STAKING_CONTRACT_ID" \
    --network "$NETWORK" \
    -- \
    get_global_state 2>&1) || true

echo "$GLOBAL_STATE"

print_success "=========================================="
print_success "Upgrade complete!"
print_success "=========================================="
echo ""
print_info "Contract: $STAKING_CONTRACT_ID"
print_info "WASM hash: $WASM_HASH"
print_info "Version: $NEW_VERSION"
echo ""
print_warning "Next steps:"
echo "  1. Test lock() with a small amount"
echo "  2. Test get_user_reward_info with an existing user"
echo "  3. Verify unstake cooldowns work correctly"
echo ""
