#!/bin/bash
################################################################################
# BLUB Migration Airdrop Script
#
# Distributes new BLUB tokens to all users affected by the bricked contract.
# Based on migration_snapshot.json taken on 2026-01-31.
#
# IMPORTANT: Run this AFTER creating the new BLUB SAC (Step 5) but BEFORE
#            transferring SAC admin to the staking contract (Step 8).
#            The new issuer must still be the SAC admin to mint.
#
# Prerequisites:
#   - stellar CLI installed
#   - jq installed (brew install jq)
#   - New BLUB issuer identity configured (blub-issuer-v2)
#   - New BLUB SAC deployed (Step 5 completed)
################################################################################

set -e

# Color codes
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
# CONFIGURATION - UPDATE THESE BEFORE RUNNING
################################################################################

# New BLUB SAC contract ID (from Step 5: stellar contract asset deploy)
NEW_BLUB_SAC_ID="CBMFDIRY5OKI4JJURXC4SMEQPWB4UUADIADJK4NA6CYBNOYK4W4TMLLF"

# Identity name for the new BLUB issuer (from Step 1: stellar keys generate)
ISSUER_IDENTITY="blub-issuer-v2"

# Network
NETWORK="mainnet"

# Path to snapshot file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SNAPSHOT_FILE="$SCRIPT_DIR/migration_snapshot.json"

# Log file
LOG_FILE="$SCRIPT_DIR/migration_airdrop_$(date +%Y%m%d_%H%M%S).log"

################################################################################
# VALIDATION
################################################################################

if [ -z "$NEW_BLUB_SAC_ID" ]; then
    print_error "NEW_BLUB_SAC_ID is not set. Update the script configuration first."
    print_info "Set it to the contract ID output from: stellar contract asset deploy"
    exit 1
fi

if [ ! -f "$SNAPSHOT_FILE" ]; then
    print_error "Snapshot file not found: $SNAPSHOT_FILE"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    print_error "jq is required but not installed. Install with: brew install jq"
    exit 1
fi

if ! command -v stellar &> /dev/null; then
    print_error "stellar CLI is not installed"
    exit 1
fi

# Verify the issuer identity exists
ISSUER_ADDRESS=$(stellar keys address "$ISSUER_IDENTITY" 2>/dev/null) || {
    print_error "Issuer identity '$ISSUER_IDENTITY' not found. Run Step 1 first."
    exit 1
}

print_info "=========================================="
print_info "BLUB Migration Airdrop"
print_info "=========================================="
print_info "New BLUB SAC:   $NEW_BLUB_SAC_ID"
print_info "Issuer address: $ISSUER_ADDRESS"
print_info "Network:        $NETWORK"
print_info "Snapshot:       $SNAPSHOT_FILE"
print_info "Log file:       $LOG_FILE"
echo ""

# Initialize log
echo "# BLUB Migration Airdrop Log - $(date)" > "$LOG_FILE"
echo "# New BLUB SAC: $NEW_BLUB_SAC_ID" >> "$LOG_FILE"
echo "# Issuer: $ISSUER_ADDRESS" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

################################################################################
# Helper: Convert decimal BLUB amount to stroops (i128 for SAC mint)
# BLUB has 7 decimal places, so 1.0000000 BLUB = 10000000 stroops
################################################################################
to_stroops() {
    local amount="$1"
    # Remove trailing zeros and ensure 7 decimal places, then remove the dot
    # Use awk for precision arithmetic
    echo "$amount" | awk '{printf "%.0f\n", $1 * 10000000}'
}

################################################################################
# Helper: Distribute BLUB to a user via claimable balance
# Creates a claimable balance so recipients don't need a trustline first.
# The issuer is the source, so BLUB is created from the issuer's supply.
################################################################################
mint_blub() {
    local recipient="$1"
    local amount_decimal="$2"
    local label="$3"
    local amount_stroops
    amount_stroops=$(to_stroops "$amount_decimal")

    print_info "Creating claimable balance: $amount_decimal BLUB ($amount_stroops stroops) for $recipient [$label]"

    local result
    if result=$(stellar tx new create-claimable-balance \
        --source-account "$ISSUER_IDENTITY" \
        --asset "BLUB:$ISSUER_ADDRESS" \
        --amount "$amount_stroops" \
        --claimant "$recipient" \
        --network "$NETWORK" 2>&1); then
        print_success "Created claimable balance: $amount_decimal BLUB for $recipient"
        echo "OK | $recipient | $amount_decimal BLUB | $label" >> "$LOG_FILE"
        return 0
    else
        print_error "Failed to create claimable balance for $recipient: $result"
        echo "FAIL | $recipient | $amount_decimal BLUB | $label | $result" >> "$LOG_FILE"
        return 1
    fi
}

################################################################################
# PHASE 1: Parse snapshot and build distribution list
################################################################################

print_info "=========================================="
print_info "Phase 1: Parsing snapshot"
print_info "=========================================="

# Count totals
STAKER_COUNT=$(jq '.stakers | length' "$SNAPSHOT_FILE")
HOLDER_COUNT=$(jq '.blub_holders_without_locks | length' "$SNAPSHOT_FILE")
TOTAL_USERS=$((STAKER_COUNT + HOLDER_COUNT))

TOTAL_STAKER_BLUB=$(jq '[.stakers[].blub_balance | tonumber] | add' "$SNAPSHOT_FILE")
TOTAL_HOLDER_BLUB=$(jq '[.blub_holders_without_locks[].balance | tonumber] | add' "$SNAPSHOT_FILE")

print_info "Stakers with locked BLUB:  $STAKER_COUNT users, $TOTAL_STAKER_BLUB BLUB"
print_info "Holders with wallet BLUB:  $HOLDER_COUNT users, $TOTAL_HOLDER_BLUB BLUB"
print_info "Total to distribute:       $TOTAL_USERS users"
echo ""

echo "# Distribution Summary" >> "$LOG_FILE"
echo "# Stakers: $STAKER_COUNT users, $TOTAL_STAKER_BLUB BLUB" >> "$LOG_FILE"
echo "# Holders: $HOLDER_COUNT users, $TOTAL_HOLDER_BLUB BLUB" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

################################################################################
# PHASE 2: Display full distribution plan for confirmation
################################################################################

print_info "=========================================="
print_info "Phase 2: Distribution Plan"
print_info "=========================================="
echo ""
printf "%-60s %20s  %s\n" "ADDRESS" "AMOUNT (BLUB)" "TYPE"
printf "%-60s %20s  %s\n" "-------" "-------------" "----"

# Stakers
jq -r '.stakers[] | "\(.address) \(.blub_balance)"' "$SNAPSHOT_FILE" | while read -r addr amount; do
    printf "%-60s %20s  %s\n" "$addr" "$amount" "STAKER (locked)"
done

# Holders
jq -r '.blub_holders_without_locks[] | "\(.address) \(.balance)"' "$SNAPSHOT_FILE" | while read -r addr amount; do
    printf "%-60s %20s  %s\n" "$addr" "$amount" "HOLDER (wallet)"
done

echo ""
print_warning "TOTAL NEW BLUB TO MINT: $(echo "$TOTAL_STAKER_BLUB + $TOTAL_HOLDER_BLUB" | bc) BLUB"
echo ""

################################################################################
# PHASE 3: Confirm before proceeding
################################################################################

print_warning "This will mint new BLUB tokens on MAINNET to $TOTAL_USERS users."
print_warning "Make sure the new BLUB SAC admin has NOT been transferred to the staking contract yet."
echo ""
read -p "Type 'AIRDROP' to proceed: " CONFIRM

if [ "$CONFIRM" != "AIRDROP" ]; then
    print_error "Aborted. No tokens were minted."
    exit 1
fi

echo ""

################################################################################
# PHASE 4: Mint to stakers (BLUB locked in bricked contract)
################################################################################

print_info "=========================================="
print_info "Phase 4: Minting to stakers (locked BLUB)"
print_info "=========================================="

STAKER_SUCCESS=0
STAKER_FAIL=0

while IFS=$'\t' read -r addr amount; do
    if mint_blub "$addr" "$amount" "staker-locked"; then
        ((STAKER_SUCCESS++))
    else
        ((STAKER_FAIL++))
    fi
    # Small delay to avoid rate limiting
    sleep 2
done < <(jq -r '.stakers[] | [.address, .blub_balance] | @tsv' "$SNAPSHOT_FILE")

print_info "Stakers: $STAKER_SUCCESS succeeded, $STAKER_FAIL failed"
echo ""

################################################################################
# PHASE 5: Mint to holders (old BLUB in wallets)
################################################################################

print_info "=========================================="
print_info "Phase 5: Minting to holders (wallet BLUB)"
print_info "=========================================="

HOLDER_SUCCESS=0
HOLDER_FAIL=0

while IFS=$'\t' read -r addr amount; do
    if mint_blub "$addr" "$amount" "holder-wallet"; then
        ((HOLDER_SUCCESS++))
    else
        ((HOLDER_FAIL++))
    fi
    # Small delay to avoid rate limiting
    sleep 2
done < <(jq -r '.blub_holders_without_locks[] | [.address, .balance] | @tsv' "$SNAPSHOT_FILE")

print_info "Holders: $HOLDER_SUCCESS succeeded, $HOLDER_FAIL failed"
echo ""

################################################################################
# PHASE 6: Summary
################################################################################

TOTAL_SUCCESS=$((STAKER_SUCCESS + HOLDER_SUCCESS))
TOTAL_FAIL=$((STAKER_FAIL + HOLDER_FAIL))

print_info "=========================================="
print_info "Airdrop Complete"
print_info "=========================================="
print_info "Total: $TOTAL_SUCCESS succeeded, $TOTAL_FAIL failed out of $TOTAL_USERS users"

if [ "$TOTAL_FAIL" -gt 0 ]; then
    print_warning "Some mints failed! Check the log file for details: $LOG_FILE"
    print_warning "Common failure reasons:"
    print_warning "  - Recipient doesn't have a trustline to new BLUB"
    print_warning "  - SAC admin already transferred to staking contract"
    print_warning "  - Insufficient XLM for transaction fees"
    echo ""
    print_info "Failed addresses (re-run after fixing):"
    grep "^FAIL" "$LOG_FILE" | while IFS='|' read -r status addr amount label error; do
        print_error "  $addr -$amount - $error"
    done
fi

echo ""
echo "# Final Results: $TOTAL_SUCCESS OK, $TOTAL_FAIL FAIL" >> "$LOG_FILE"

print_success "Log saved to: $LOG_FILE"
echo ""

if [ "$TOTAL_FAIL" -eq 0 ]; then
    print_success "All users received their new BLUB tokens!"
    print_info "You can now proceed with Step 8 (transfer SAC admin to staking contract)."
else
    print_warning "Fix failures before proceeding to Step 8."
fi
