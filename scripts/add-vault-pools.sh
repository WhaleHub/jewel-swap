#!/bin/bash
################################################################################
# Add Vault Pools to WhaleHub Staking Contract
#
# Contract function: add_pool(pool_address, token_a, token_b, share_token) -> u32
#   - pool_address: Aquarius AMM pool contract address
#   - token_a: Soroban SAC address for token A
#   - token_b: Soroban SAC address for token B
#   - share_token: LP share token contract address
#
# To find Aquarius pool addresses, check:
#   https://aqua.network/pools
#   or query via Stellar CLI / Horizon API
#
# Usage:
#   ./add-vault-pools.sh pool1   # Add BLUB/AQUA pool
#   ./add-vault-pools.sh pool2   # Add XLM/USDC pool
#   ./add-vault-pools.sh pool3   # Add AQUA/XLM pool
#   ./add-vault-pools.sh all     # Add all three pools
#   ./add-vault-pools.sh status  # Check current pool count
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

################################################################################
# CONFIGURATION
################################################################################

NETWORK="mainnet"
ADMIN_IDENTITY="blub-issuer-v2"

# Staking contract (REACT_APP_STAKING_CONTRACT_ID) - has add_pool function
STAKING_CONTRACT="CC72BEVVKHQ57PB5FCKAZYRXCSR6DOQSTN46QR7RZMMM64YWNRPDS24S"

# Token SAC addresses (Soroban Asset Contracts)
AQUA_TOKEN="CAUIKL3IYGMERDRUN6YSCLWVAKIFG5Q4YJHUKM4S4NJZQIA3BAS6OJPK"
BLUB_TOKEN="CBMFDIRY5OKI4JJURXC4SMEQPWB4UUADIADJK4NA6CYBNOYK4W4TMLLF"
# XLM native SAC - the wrapped XLM Soroban contract on mainnet
# Canonical address from: stellar contract id asset --asset native --network mainnet
XLM_TOKEN="CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA"
# USDC SAC
USDC_TOKEN="CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75"

################################################################################
# Aquarius AMM Pool Addresses
# Queried from on-chain contracts via `stellar contract invoke -- get_tokens` and `-- share_id`
################################################################################

# Pool 1: BLUB/AQUA
# Pool tokens: CAUIKL3IYGMERDRUN6YSCLWVAKIFG5Q4YJHUKM4S4NJZQIA3BAS6OJPK (AQUA), CBMFDIRY5OKI4JJURXC4SMEQPWB4UUADIADJK4NA6CYBNOYK4W4TMLLF (BLUB)
BLUB_AQUA_POOL_ADDRESS="CAMXZXXBD7DFBLYLHUW24U4MY37X7SU5XXT5ZVVUBXRXWLAIM7INI7G2"
BLUB_AQUA_SHARE_TOKEN="CDMRHKJCYYHZTRQVR7NY43PR7ISMRBYC2O57IMVAQ7B7P2I2XGIZLI5E"

# Pool 2: XLM/USDC
# Pool tokens: CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA (XLM), CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75 (USDC)
XLM_USDC_POOL_ADDRESS="CA6PUJLBYKZKUEKLZJMKBZLEKP2OTHANDEOWSFF44FTSYLKQPIICCJBE"
XLM_USDC_SHARE_TOKEN="CAVKLYY4RWFQBRA2YI5GTGGXKUKJQI3JLAHDGXMS7L5RDH6X6A47NMOZ"

# Pool 3: AQUA/XLM
# Pool tokens: CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA (XLM), CAUIKL3IYGMERDRUN6YSCLWVAKIFG5Q4YJHUKM4S4NJZQIA3BAS6OJPK (AQUA)
AQUA_XLM_POOL_ADDRESS="CCY2PXGMKNQHO7WNYXEWX76L2C5BH3JUW3RCATGUYKY7QQTRILBZIFWV"
AQUA_XLM_SHARE_TOKEN="CBOHAVUYKQD4C7FIVXEDJCVLUZYUO6RN3VIKEDOTIJGDDV3QN33Y4T4D"

################################################################################
# FUNCTIONS
################################################################################

add_pool() {
    local POOL_NAME=$1
    local POOL_ADDRESS=$2
    local TOKEN_A=$3
    local TOKEN_B=$4
    local SHARE_TOKEN=$5

    # Validate addresses are filled in
    if [[ "$POOL_ADDRESS" == __*__ ]] || [[ "$SHARE_TOKEN" == __*__ ]]; then
        print_error "Pool addresses not configured for $POOL_NAME"
        print_error "Edit this script and fill in the Aquarius pool contract addresses"
        exit 1
    fi

    print_info "Adding pool: $POOL_NAME"
    print_info "  Pool contract:  $POOL_ADDRESS"
    print_info "  Token A:        $TOKEN_A"
    print_info "  Token B:        $TOKEN_B"
    print_info "  Share token:    $SHARE_TOKEN"
    echo ""

    stellar contract invoke \
        --id "$STAKING_CONTRACT" \
        --source "$ADMIN_IDENTITY" \
        --network "$NETWORK" \
        -- \
        add_pool \
        --pool_address "$POOL_ADDRESS" \
        --token_a "$TOKEN_A" \
        --token_b "$TOKEN_B" \
        --share_token "$SHARE_TOKEN"

    if [ $? -eq 0 ]; then
        print_success "Pool '$POOL_NAME' added successfully!"
    else
        print_error "Failed to add pool '$POOL_NAME'"
        exit 1
    fi

    sleep 2
}

check_status() {
    print_info "Checking current pool count..."

    stellar contract invoke \
        --id "$STAKING_CONTRACT" \
        --source "$ADMIN_IDENTITY" \
        --network "$NETWORK" \
        -- \
        get_pool_count

    echo ""

    # Try to get info for pools 0-9
    for i in $(seq 0 9); do
        print_info "Pool $i:"
        stellar contract invoke \
            --id "$STAKING_CONTRACT" \
            --source "$ADMIN_IDENTITY" \
            --network "$NETWORK" \
            -- \
            get_pool_info \
            --pool_id "$i" 2>/dev/null || { echo "  (not found)"; continue; }
        echo ""
    done
}

################################################################################
# MAIN
################################################################################

case "${1:-}" in
    pool1)
        print_info "=== Adding Pool 1: BLUB/AQUA ==="
        add_pool "BLUB/AQUA" "$BLUB_AQUA_POOL_ADDRESS" "$BLUB_TOKEN" "$AQUA_TOKEN" "$BLUB_AQUA_SHARE_TOKEN"
        ;;
    pool2)
        print_info "=== Adding Pool 2: XLM/USDC ==="
        add_pool "XLM/USDC" "$XLM_USDC_POOL_ADDRESS" "$XLM_TOKEN" "$USDC_TOKEN" "$XLM_USDC_SHARE_TOKEN"
        ;;
    pool3)
        print_info "=== Adding Pool 3: AQUA/XLM ==="
        add_pool "AQUA/XLM" "$AQUA_XLM_POOL_ADDRESS" "$AQUA_TOKEN" "$XLM_TOKEN" "$AQUA_XLM_SHARE_TOKEN"
        ;;
    all)
        print_info "=== Adding All 3 Pools ==="
        echo ""
        add_pool "BLUB/AQUA" "$BLUB_AQUA_POOL_ADDRESS" "$BLUB_TOKEN" "$AQUA_TOKEN" "$BLUB_AQUA_SHARE_TOKEN"
        add_pool "XLM/USDC" "$XLM_USDC_POOL_ADDRESS" "$XLM_TOKEN" "$USDC_TOKEN" "$XLM_USDC_SHARE_TOKEN"
        add_pool "AQUA/XLM" "$AQUA_XLM_POOL_ADDRESS" "$AQUA_TOKEN" "$XLM_TOKEN" "$AQUA_XLM_SHARE_TOKEN"
        print_success "All pools added!"
        ;;
    status)
        check_status
        ;;
    *)
        echo "Usage: $0 {pool1|pool2|pool3|all|status}"
        echo ""
        echo "Pools:"
        echo "  pool1  - BLUB/AQUA"
        echo "  pool2  - XLM/USDC"
        echo "  pool3  - AQUA/XLM"
        echo "  all    - Add all three pools"
        echo "  status - Check current pool count and info"
        echo ""
        ;;
esac
