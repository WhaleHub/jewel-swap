#!/bin/bash
set -euo pipefail

# === Configuration ===
SOURCE="blub-issuer-v2"
NETWORK="mainnet"
CONTRACT="CC72BEVVKHQ57PB5FCKAZYRXCSR6DOQSTN46QR7RZMMM64YWNRPDS24S"
ADMIN="GDERSSCKJQPPXUQOZIOXGRVAGNLVPVZCJ2MAX7RCMVMWGRPVAEG7XGTK"
NEW_TREASURY="GBYQWGLZ4X5ZRS7VXVSKSDM72MQ4KFF4EW3PFH6UPUP5INGHMJS7C2R3"
WASM="/Users/viktorvostrikov/Desktop/whalehub/jewel-swap/soroban-contracts/staking-contract/target/wasm32-unknown-unknown/release/whalehub_staking.optimized.wasm"
FEE="1400000000"

echo "=== Configuration ==="
echo "  Source:   $SOURCE"
echo "  Network:  $NETWORK"
echo "  Contract: $CONTRACT"
echo "  WASM:     $WASM"
echo ""

# Check WASM file exists
if [ ! -f "$WASM" ]; then
  echo "ERROR: WASM file not found at $WASM"
  echo "Did you build first? Run:"
  echo "  cargo build --release --target wasm32-unknown-unknown --package whalehub-staking"
  exit 1
fi
echo "WASM file found ($(wc -c < "$WASM") bytes)"
echo ""

echo "=== Step 1: Install WASM ==="
echo "Running: stellar contract install --source $SOURCE --network $NETWORK --wasm $WASM --fee $FEE"
INSTALL_OUTPUT=$(stellar contract install --source "$SOURCE" --network "$NETWORK" --wasm "$WASM" --fee "$FEE" 2>/dev/null) || {
  echo "FAILED to install WASM. Retrying with stderr visible..."
  stellar contract install --source "$SOURCE" --network "$NETWORK" --wasm "$WASM" --fee "$FEE"
  exit 1
}
# Extract just the hash (last line, 64-char hex string)
WASM_HASH=$(echo "$INSTALL_OUTPUT" | grep -oE '[0-9a-f]{64}' | tail -1)
if [ -z "$WASM_HASH" ]; then
  echo "ERROR: Could not extract WASM hash from output:"
  echo "$INSTALL_OUTPUT"
  exit 1
fi
echo "WASM hash: $WASM_HASH"

echo ""
echo "=== Step 2: Upgrade contract ==="
echo "Running: stellar contract invoke --id $CONTRACT --source $SOURCE --network $NETWORK -- upgrade --admin $ADMIN --new_wasm_hash $WASM_HASH"
UPGRADE_OUT=$(stellar contract invoke --id "$CONTRACT" --source "$SOURCE" --network "$NETWORK" --fee "$FEE" -- upgrade --admin "$ADMIN" --new_wasm_hash "$WASM_HASH" 2>&1) || {
  echo "FAILED to upgrade contract."
  echo "Output: $UPGRADE_OUT"
  exit 1
}
echo "Upgrade successful"
echo "Output: $UPGRADE_OUT"

echo ""
echo "=== Step 3: Set vault treasury ==="
echo "Running: stellar contract invoke --id $CONTRACT --source $SOURCE --network $NETWORK -- update_vault_treasury --admin $ADMIN --new_treasury $NEW_TREASURY"
TREASURY_OUT=$(stellar contract invoke --id "$CONTRACT" --source "$SOURCE" --network "$NETWORK" --fee "$FEE" -- update_vault_treasury --admin "$ADMIN" --new_treasury "$NEW_TREASURY" 2>&1) || {
  echo "FAILED to set vault treasury."
  echo "Output: $TREASURY_OUT"
  exit 1
}
echo "Vault treasury updated to $NEW_TREASURY"
echo "Output: $TREASURY_OUT"

echo ""
echo "=== Step 4: Verify ==="
echo "Pool count:"
stellar contract invoke --id "$CONTRACT" --source "$SOURCE" --network "$NETWORK" --fee "$FEE" -- get_pool_count
echo ""
echo "=== All done ==="
