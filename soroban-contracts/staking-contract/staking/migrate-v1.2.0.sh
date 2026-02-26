#!/bin/bash
################################################################################
# WhaleHub Staking v1.2.0 — Full Migration Script (Mainnet)
#
# This script handles the complete migration from the bricked v1.1.0 contract
# to a fresh v1.2.0 deployment with a new BLUB issuer.
#
# Run each step individually by passing the step number:
#   ./migrate-v1.2.0.sh step1   # Fund new issuer
#   ./migrate-v1.2.0.sh step2   # Deploy new BLUB SAC
#   ./migrate-v1.2.0.sh step3   # Build staking contract
#   ./migrate-v1.2.0.sh step4   # Deploy staking contract
#   ./migrate-v1.2.0.sh step5   # Initialize staking contract
#   ./migrate-v1.2.0.sh step6   # Transfer BLUB SAC admin to staking contract
#   ./migrate-v1.2.0.sh status  # Show current migration state
#
# Prerequisites:
#   - stellar CLI installed
#   - Identities: whalehub-main, blub-issuer-v2
#   - jq installed
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
print_step()    { echo -e "\n${CYAN}══════════════════════════════════════════${NC}"; echo -e "${CYAN}  STEP $1: $2${NC}"; echo -e "${CYAN}══════════════════════════════════════════${NC}\n"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(dirname "$SCRIPT_DIR")"
STATE_FILE="$SCRIPT_DIR/migration_state.json"

################################################################################
# CONFIGURATION
################################################################################

NETWORK="mainnet"

# Identities
ADMIN_IDENTITY="whalehub-main"
ISSUER_IDENTITY="blub-issuer-v2"

# Admin address (derived from whalehub-main)
ADMIN_ADDRESS="GBLH7JNNONQ7DZPL4J2FQOUWOKUKTCVRNYVPJLJBWHWCLYJHLVVGULGO"

# New BLUB issuer address (from blub-issuer-v2)
ISSUER_ADDRESS="GDERSSCKJQPPXUQOZIOXGRVAGNLVPVZCJ2MAX7RCMVMWGRPVAEG7XGTK"

# Old contracts (bricked)
OLD_STAKING_CONTRACT="CBGYTUQDPZAKOM2YULOSBLQB4XPNSUGD6GBEK75EWEOAXLAVOD7C4HGO"
OLD_BLUB_TOKEN="CDSSDKJZACMXIE4C25TAVLWUQWLRNXSC2TLOFTTRSUAOZOMU5PXGZYEX"

# Fixed external addresses
AQUA_TOKEN="CAUIKL3IYGMERDRUN6YSCLWVAKIFG5Q4YJHUKM4S4NJZQIA3BAS6OJPK"
LIQUIDITY_CONTRACT="CBL7MWLEZ4SU6YC5XL4T3WXKNKNO2UQVDVONOQSW5VVCYFWORROHY4AM"

# ICE tokens (same as v1.1.0)
ICE_TOKEN="CARCKZ66U4AI2545NS4RAF47QVEXG3PRRCDA52H4Q3FDRAGSMP4BRU3W"
GOVERN_ICE_TOKEN="CCTE3UCZZ6RCG3IN7HGFQ6TVJS5UDSZL3BUAVC3OQVWXRLTPFGOLPSNV"
UPVOTE_ICE_TOKEN="CDSOP5Y4ZOWA7UNV76KB7QM6IZHX6UAMGYQ5THT35AEWRXF5QTKERG4R"
DOWNVOTE_ICE_TOKEN="CDZOOVFGMCNQNGGBYJ5BEMDXVOBE7QURYBBMXVXYXDEWIFK3BJ345QHX"

# Vault settings
VAULT_TREASURY="$ADMIN_ADDRESS"
VAULT_FEE_BPS="100"  # 1%

# WASM path
STAKING_WASM="$SCRIPT_DIR/whalehub_staking.wasm"

# Snapshot (for future airdrop)
SNAPSHOT_FILE="$SCRIPT_DIR/migration_snapshot.json"

################################################################################
# STATE MANAGEMENT - track which steps have been completed
################################################################################

init_state() {
    if [ ! -f "$STATE_FILE" ]; then
        cat > "$STATE_FILE" << 'STATEEOF'
{
  "migration_version": "1.2.0",
  "started_at": "",
  "step1_fund_issuer": false,
  "step2_deploy_sac": false,
  "step3_build": false,
  "step4_deploy_staking": false,
  "step5_init_staking": false,
  "step6_transfer_sac_admin": false,
  "new_blub_sac_id": "",
  "new_staking_contract": ""
}
STATEEOF
        local ts
        ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        jq --arg ts "$ts" '.started_at = $ts' "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
    fi
}

get_state() {
    jq -r ".$1" "$STATE_FILE"
}

set_state() {
    jq --arg v "$2" ".$1 = \$v" "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
}

set_state_bool() {
    jq ".$1 = $2" "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
}

################################################################################
# STEP 1: Fund the new BLUB issuer account
################################################################################

step1_fund_issuer() {
    print_step "1" "Fund New BLUB Issuer Account"

    print_info "New issuer: $ISSUER_ADDRESS"
    print_info "You need to send at least 5 XLM to this address to cover:"
    print_info "  - 1 XLM base reserve"
    print_info "  - 1 XLM trustline reserve"
    print_info "  - ~3 XLM for transaction fees (SAC deploy)"
    echo ""

    # Check if already funded
    print_info "Checking account balance..."
    if stellar contract invoke \
        --id CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA \
        --network mainnet \
        -- \
        balance \
        --id "$ISSUER_ADDRESS" 2>/dev/null; then
        print_success "Account appears to exist on-chain"
    else
        print_warning "Account not funded yet or check failed"
    fi

    echo ""
    print_info "To fund from the admin account, run:"
    echo ""
    echo "  stellar tx new \\"
    echo "    --source $ADMIN_IDENTITY \\"
    echo "    --network $NETWORK \\"
    echo "    create-account --destination $ISSUER_ADDRESS --starting-balance 5"
    echo ""

    read -p "Has the issuer been funded? (yes/no): " FUNDED
    if [ "$FUNDED" = "yes" ]; then
        set_state_bool "step1_fund_issuer" true
        print_success "Step 1 complete: Issuer funded"
    else
        print_warning "Step 1 incomplete. Fund the issuer and re-run this step."
    fi
}

################################################################################
# STEP 2: Deploy Stellar Asset Contract (SAC) for new BLUB
################################################################################

step2_deploy_sac() {
    print_step "2" "Deploy New BLUB SAC"

    if [ "$(get_state step1_fund_issuer)" != "true" ]; then
        print_error "Step 1 not completed. Fund the issuer first."
        exit 1
    fi

    print_info "Deploying SAC for BLUB:$ISSUER_ADDRESS"
    echo ""

    NEW_BLUB_SAC_ID=$(stellar contract asset deploy \
        --asset "BLUB:$ISSUER_ADDRESS" \
        --source "$ISSUER_IDENTITY" \
        --network "$NETWORK" 2>&1)

    if [ $? -eq 0 ] && [ -n "$NEW_BLUB_SAC_ID" ]; then
        print_success "New BLUB SAC deployed!"
        print_success "Contract ID: $NEW_BLUB_SAC_ID"

        set_state "new_blub_sac_id" "$NEW_BLUB_SAC_ID"
        set_state_bool "step2_deploy_sac" true

        echo ""
        print_info "Verify on explorer:"
        echo "  https://stellar.expert/explorer/public/contract/$NEW_BLUB_SAC_ID"
    else
        print_error "SAC deployment failed: $NEW_BLUB_SAC_ID"
        exit 1
    fi
}

################################################################################
# STEP 3: Build staking contract
################################################################################

step3_build() {
    print_step "3" "Build Staking Contract"

    print_info "Building staking contract..."
    cargo build --release --target wasm32-unknown-unknown \
        --manifest-path "$CONTRACTS_DIR/staking/Cargo.toml" \
        --package whalehub-staking

    # Copy optimized WASM
    local BUILD_WASM="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release/whalehub_staking.wasm"
    if [ -f "$BUILD_WASM" ]; then
        cp "$BUILD_WASM" "$STAKING_WASM"
        print_success "Staking WASM copied to $STAKING_WASM"
    fi

    # Optimize if possible
    if stellar contract optimize --wasm "$STAKING_WASM" 2>/dev/null; then
        print_success "Staking WASM optimized"
    else
        print_warning "Could not optimize WASM (non-critical)"
    fi

    print_info "WASM size:"
    ls -lh "$STAKING_WASM" 2>/dev/null

    set_state_bool "step3_build" true
    print_success "Step 3 complete: Staking contract built"
}

################################################################################
# STEP 4: Deploy staking contract
################################################################################

step4_deploy_staking() {
    print_step "4" "Deploy New Staking Contract"

    if [ "$(get_state step3_build)" != "true" ]; then
        print_error "Step 3 not completed. Build the contract first."
        exit 1
    fi

    if [ ! -f "$STAKING_WASM" ]; then
        print_error "Staking WASM not found: $STAKING_WASM"
        exit 1
    fi

    print_info "Deploying staking contract..."

    NEW_STAKING=$(stellar contract deploy \
        --wasm "$STAKING_WASM" \
        --source "$ADMIN_IDENTITY" \
        --network "$NETWORK" 2>&1)

    if [ $? -eq 0 ] && [ -n "$NEW_STAKING" ]; then
        print_success "New staking contract deployed!"
        print_success "Contract ID: $NEW_STAKING"

        set_state "new_staking_contract" "$NEW_STAKING"
        set_state_bool "step4_deploy_staking" true
    else
        print_error "Deployment failed: $NEW_STAKING"
        exit 1
    fi
}

################################################################################
# STEP 5: Initialize staking contract
################################################################################

step5_init_staking() {
    print_step "5" "Initialize Staking Contract"

    local STAKING_ID
    STAKING_ID=$(get_state new_staking_contract)
    local SAC_ID
    SAC_ID=$(get_state new_blub_sac_id)

    if [ -z "$STAKING_ID" ] || [ "$STAKING_ID" = "null" ]; then
        print_error "No staking contract ID. Run step 4 first."
        exit 1
    fi
    if [ -z "$SAC_ID" ] || [ "$SAC_ID" = "null" ]; then
        print_error "No BLUB SAC ID. Run step 2 first."
        exit 1
    fi

    print_info "Staking contract:  $STAKING_ID"
    print_info "AQUA token:        $AQUA_TOKEN"
    print_info "New BLUB SAC:      $SAC_ID"
    print_info "Liquidity pool:    $LIQUIDITY_CONTRACT"
    print_info "Admin:             $ADMIN_ADDRESS"
    echo ""

    stellar contract invoke \
        --id "$STAKING_ID" \
        --source "$ADMIN_IDENTITY" \
        --network "$NETWORK" \
        -- \
        initialize \
        --admin "$ADMIN_ADDRESS" \
        --treasury_address "$ADMIN_ADDRESS" \
        --aqua_token "$AQUA_TOKEN" \
        --blub_token "$SAC_ID" \
        --liquidity_contract "$LIQUIDITY_CONTRACT" \
        --ice_tokens "{\"ice_token\":\"$ICE_TOKEN\",\"govern_ice_token\":\"$GOVERN_ICE_TOKEN\",\"upvote_ice_token\":\"$UPVOTE_ICE_TOKEN\",\"downvote_ice_token\":\"$DOWNVOTE_ICE_TOKEN\"}" \
        --vault_treasury "$VAULT_TREASURY" \
        --vault_fee_bps "$VAULT_FEE_BPS"

    if [ $? -eq 0 ]; then
        set_state_bool "step5_init_staking" true
        print_success "Step 5 complete: Staking contract initialized"
    else
        print_error "Initialization failed"
        exit 1
    fi
}

################################################################################
# STEP 6: Transfer BLUB SAC admin from issuer to new staking contract
################################################################################

step6_transfer_sac_admin() {
    print_step "6" "Transfer BLUB SAC Admin to Staking Contract"

    local STAKING_ID
    STAKING_ID=$(get_state new_staking_contract)
    local SAC_ID
    SAC_ID=$(get_state new_blub_sac_id)

    if [ -z "$STAKING_ID" ] || [ "$STAKING_ID" = "null" ]; then
        print_error "No staking contract. Run step 4 first."
        exit 1
    fi
    if [ -z "$SAC_ID" ] || [ "$SAC_ID" = "null" ]; then
        print_error "No BLUB SAC ID. Run step 2 first."
        exit 1
    fi

    if [ "$(get_state step5_init_staking)" != "true" ]; then
        print_error "Staking contract not initialized. Run step 5 first."
        exit 1
    fi

    print_warning "THIS IS IRREVERSIBLE!"
    print_warning "After this, only the staking contract can mint new BLUB."
    print_info "Transferring SAC admin:"
    print_info "  From: $ISSUER_ADDRESS (blub-issuer-v2)"
    print_info "  To:   $STAKING_ID (new staking contract)"
    echo ""

    read -p "Type 'TRANSFER' to proceed: " CONFIRM
    if [ "$CONFIRM" != "TRANSFER" ]; then
        print_error "Aborted."
        exit 1
    fi

    stellar contract invoke \
        --id "$SAC_ID" \
        --source "$ISSUER_IDENTITY" \
        --network "$NETWORK" \
        -- \
        set_admin \
        --new_admin "$STAKING_ID"

    if [ $? -eq 0 ]; then
        set_state_bool "step6_transfer_sac_admin" true
        print_success "Step 6 complete: SAC admin transferred to staking contract"
        echo ""
        print_success "Migration complete! The new staking contract is now the BLUB minter."
    else
        print_error "Transfer failed"
        exit 1
    fi
}

################################################################################
# COMMENTED OUT: Airdrop step — uncomment when ready to distribute old BLUB
################################################################################
#
# step_airdrop() {
#     print_step "X" "Airdrop New BLUB to Existing Holders"
#
#     local SAC_ID
#     SAC_ID=$(get_state new_blub_sac_id)
#
#     if [ -z "$SAC_ID" ] || [ "$SAC_ID" = "null" ]; then
#         print_error "No SAC ID found in state. Deploy SAC first."
#         exit 1
#     fi
#
#     print_info "Using distribute_new_blub.sh"
#     print_info "New BLUB SAC: $SAC_ID"
#     print_info "Snapshot: $SNAPSHOT_FILE"
#     echo ""
#
#     # Update the NEW_BLUB_SAC_ID in distribute_new_blub.sh
#     if [ -f "$SCRIPT_DIR/distribute_new_blub.sh" ]; then
#         sed -i '' "s|^NEW_BLUB_SAC_ID=.*|NEW_BLUB_SAC_ID=\"$SAC_ID\"|" "$SCRIPT_DIR/distribute_new_blub.sh"
#         print_info "Updated SAC ID in distribute_new_blub.sh"
#         echo ""
#         print_info "Run the airdrop script:"
#         echo "  bash $SCRIPT_DIR/distribute_new_blub.sh"
#         echo ""
#         read -p "Has the airdrop completed successfully? (yes/no): " DONE
#         if [ "$DONE" = "yes" ]; then
#             print_success "Airdrop done"
#         fi
#     else
#         print_error "distribute_new_blub.sh not found in $SCRIPT_DIR"
#         exit 1
#     fi
# }

################################################################################
# STATUS: Show current migration progress
################################################################################

show_status() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║       WhaleHub v1.2.0 Migration Status          ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
    echo ""

    if [ ! -f "$STATE_FILE" ]; then
        print_warning "No migration state found. Run a step to begin."
        return
    fi

    local check="${GREEN}✓${NC}"
    local cross="${RED}✗${NC}"

    step_status() {
        local key=$1
        local label=$2
        if [ "$(get_state "$key")" = "true" ]; then
            echo -e "  $check $label"
        else
            echo -e "  $cross $label"
        fi
    }

    step_status "step1_fund_issuer"        "Step 1: Fund new BLUB issuer"
    step_status "step2_deploy_sac"         "Step 2: Deploy new BLUB SAC"
    step_status "step3_build"              "Step 3: Build staking contract"
    step_status "step4_deploy_staking"     "Step 4: Deploy staking contract"
    step_status "step5_init_staking"       "Step 5: Initialize staking"
    step_status "step6_transfer_sac_admin" "Step 6: Transfer SAC admin"

    echo ""
    echo -e "${BLUE}Addresses:${NC}"
    echo "  Admin:              $ADMIN_ADDRESS"
    echo "  New BLUB Issuer:    $ISSUER_ADDRESS"

    local val
    val=$(get_state new_blub_sac_id)
    [ -n "$val" ] && [ "$val" != "null" ] && [ "$val" != "" ] && echo "  New BLUB SAC:       $val"

    val=$(get_state new_staking_contract)
    [ -n "$val" ] && [ "$val" != "null" ] && [ "$val" != "" ] && echo "  New Staking:        $val"

    echo ""
    echo -e "${BLUE}Old (bricked) contracts:${NC}"
    echo "  Old Staking:        $OLD_STAKING_CONTRACT"
    echo "  Old BLUB:           $OLD_BLUB_TOKEN"
    echo ""
    echo -e "${YELLOW}NOTE: BLUB airdrop to old holders is commented out — run separately when ready.${NC}"
    echo ""
}

################################################################################
# MAIN
################################################################################

init_state

case "${1:-}" in
    step1)  step1_fund_issuer ;;
    step2)  step2_deploy_sac ;;
    step3)  step3_build ;;
    step4)  step4_deploy_staking ;;
    step5)  step5_init_staking ;;
    step6)  step6_transfer_sac_admin ;;
    status) show_status ;;
    *)
        echo "Usage: $0 {step1|step2|step3|step4|step5|step6|status}"
        echo ""
        echo "Steps:"
        echo "  step1  - Fund new BLUB issuer account"
        echo "  step2  - Deploy new BLUB SAC (Stellar Asset Contract)"
        echo "  step3  - Build staking contract"
        echo "  step4  - Deploy new staking contract"
        echo "  step5  - Initialize staking contract"
        echo "  step6  - Transfer BLUB SAC admin to staking contract (irreversible)"
        echo "  status - Show migration progress"
        echo ""
        echo "  (BLUB airdrop to old holders commented out — uncomment when ready)"
        ;;
esac


# https://aqua.network/vote/?base=BLUB:GDERSSCKJQPPXUQOZIOXGRVAGNLVPVZCJ2MAX7RCMVMWGRPVAEG7XGTK&counter=AQUA:GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA




stellar contract optimize --wasm /Users/viktorvostrikov/Desktop/whalehub/jewel-swap/soroban-contracts/staking-contract/target/wasm32-unknown-unknown/release/whalehub_staking.wasm 
    stellar contract install --source blub-issuer-v2 --network mainnet --wasm /Users/viktorvostrikov/Desktop/whalehub/jewel-swap/soroban-contracts/staking-contract/target/wasm32-unknown-unknown/release/whalehub_staking.wasm