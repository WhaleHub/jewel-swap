#!/usr/bin/env python3
"""
Find the pre-corruption reward_per_token_stored by:
1. Scanning Horizon for recent add_rewards calls from blub-issuer-v2 to the staking contract
2. Querying the Soroban RPC for contract instance state at ledger-1 before the bad call
"""

import json, sys, struct, base64, urllib.request, urllib.parse

STAKING_CONTRACT  = "CC72BEVVKHQ57PB5FCKAZYRXCSR6DOQSTN46QR7RZMMM64YWNRPDS24S"
MANAGER_ACCOUNT   = "GDERSSCKJQPPXUQOZIOXGRVAGNLVPVZCJ2MAX7RCMVMWGRPVAEG7XGTK"
RPC_URL           = "https://mainnet.sorobanrpc.com"
HORIZON_URL       = "https://horizon.stellar.org"

# ── Soroban RPC helper ────────────────────────────────────────────────────────
def rpc(method, params):
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    req  = urllib.request.Request(RPC_URL, data=body,
                                   headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

# ── Build LedgerKey for contract instance storage ─────────────────────────────
# We need the XDR LedgerKey for the contract's instance (all instance storage in one entry)
def get_contract_instance_key_xdr(contract_address: str) -> str:
    from stellar_sdk import StrKey
    from stellar_sdk import xdr as xdr_

    contract_id_bytes = StrKey.decode_contract(contract_address)
    ledger_key = xdr_.LedgerKey(
        type=xdr_.LedgerEntryType.CONTRACT_DATA,
        contract_data=xdr_.LedgerKeyContractData(
            contract=xdr_.SCAddress(
                type=xdr_.SCAddressType.SC_ADDRESS_TYPE_CONTRACT,
                contract_id=xdr_.Hash(contract_id_bytes),
            ),
            key=xdr_.SCVal(type=xdr_.SCValType.SCV_LEDGER_KEY_CONTRACT_INSTANCE),
            durability=xdr_.ContractDataDurability.PERSISTENT,
        ),
    )
    return ledger_key.to_xdr()

# ── Decode RewardStateV2 from instance storage map ────────────────────────────
def decode_reward_state(entries):
    from stellar_sdk import xdr as xdr_

    if not entries:
        print("No entries returned"); return None

    entry_xdr = entries[0].get("xdr") or entries[0].get("entry", {}).get("xdr")
    if not entry_xdr:
        print("Unexpected structure:", list(entries[0].keys()))
        # try to print raw
        print(json.dumps(entries[0], indent=2)[:2000])
        return None

    le = xdr_.LedgerEntry.from_xdr(entry_xdr)
    data = le.data.contract_data
    if data is None:
        print("Not a ContractData entry"); return None

    # The value is a ContractInstance with a storage map
    instance = data.val.instance
    if instance is None or instance.storage is None:
        print("No instance storage"); return None

    # storage is an SCMap (list of SCMapEntry)
    for entry in instance.storage.entries:
        k = entry.key
        v = entry.val
        # RewardStateV2 key is a symbol "RewardStateV2"
        if k.type.name == "SCV_SYMBOL" and k.sym.sc_symbol.decode() == "RewardStateV2":
            # value is a struct (SCV_MAP or SCV_STRUCT-like)
            print(f"\n✅ Found RewardStateV2:")
            if v.type.name == "SCV_MAP" and v.map:
                for me in v.map.entries:
                    field = me.key.sym.sc_symbol.decode() if me.key.type.name == "SCV_SYMBOL" else str(me.key)
                    # i128 fields
                    if me.val.type.name == "SCV_I128":
                        hi = me.val.i128.hi.int64
                        lo = me.val.i128.lo.uint64
                        val = (hi << 64) | lo
                        if hi < 0:
                            val = val - (1 << 128)
                        print(f"  {field}: {val}")
                    elif me.val.type.name == "SCV_U64":
                        print(f"  {field}: {me.val.u64.uint64}")
                    else:
                        print(f"  {field}: {me.val}")
            else:
                print(f"  raw val type: {v.type.name}")
            return v
        # Also try u32 enum variant (Soroban encodes enum variants as u32)
        if k.type.name == "SCV_U32":
            print(f"  u32 key {k.u32.uint32}: {v.type.name}")

    print("\nAll instance storage keys found:")
    for entry in instance.storage.entries:
        k = entry.key
        if k.type.name == "SCV_SYMBOL":
            print(f"  SCV_SYMBOL: {k.sym.sc_symbol.decode()}")
        elif k.type.name == "SCV_U32":
            print(f"  SCV_U32: {k.u32.uint32}")
        else:
            print(f"  {k.type.name}")
    return None

# ── Step 1: Get recent txs from MANAGER_ACCOUNT to find the bad add_rewards ──
print("Fetching recent operations from blub-issuer-v2...")
url = f"{HORIZON_URL}/accounts/{MANAGER_ACCOUNT}/operations?limit=200&order=desc"
with urllib.request.urlopen(url, timeout=30) as r:
    ops_data = json.loads(r.read())

invoke_ops = []
for op in ops_data.get("_embedded", {}).get("records", []):
    if op.get("type") == "invoke_host_function":
        invoke_ops.append(op)

print(f"Found {len(invoke_ops)} InvokeHostFunction ops (most recent first)")

# Print the most recent ones with ledger info
print("\nMost recent InvokeHostFunction operations:")
for i, op in enumerate(invoke_ops[:20]):
    tx_hash    = op.get("transaction_hash", "?")
    created_at = op.get("created_at", "?")
    paging_tok = op.get("paging_token", "?")
    # Get ledger seq from the paging token or transaction
    print(f"  [{i}] {created_at}  tx={tx_hash[:12]}...  paging={paging_tok}")

# ── Step 2: Find ledger of the bad call ──────────────────────────────────────
# We'll query each tx to see its ledger, then try ledger-1 for state before the bad call.
# The bad add_rewards calls were among the most recent — user can pick from above list.

print("\n" + "="*60)
print("Now querying contract instance state at CURRENT ledger")
print("(= 0 after reset) to confirm key encoding works...")
print("="*60)

try:
    key_xdr = get_contract_instance_key_xdr(STAKING_CONTRACT)
    resp = rpc("getLedgerEntries", {"keys": [key_xdr]})
    entries = resp.get("result", {}).get("entries", [])
    current_ledger = resp.get("result", {}).get("ledger")
    print(f"Current ledger: {current_ledger}")
    decode_reward_state(entries)
except Exception as e:
    print(f"Error: {e}")
    import traceback; traceback.print_exc()

# ── Step 3: Query tx details to get ledger numbers ───────────────────────────
if invoke_ops:
    print("\n" + "="*60)
    print("Fetching ledger numbers for recent invoke ops...")
    print("="*60)
    seen_ledgers = []
    for op in invoke_ops[:15]:
        tx_hash = op.get("transaction_hash", "")
        if not tx_hash:
            continue
        try:
            url2 = f"{HORIZON_URL}/transactions/{tx_hash}"
            with urllib.request.urlopen(url2, timeout=15) as r2:
                tx_data = json.loads(r2.read())
            ledger_seq  = tx_data.get("ledger")
            created_at  = tx_data.get("created_at")
            memo        = tx_data.get("memo", "")
            print(f"  ledger={ledger_seq}  {created_at}  tx={tx_hash[:16]}...")
            seen_ledgers.append((ledger_seq, tx_hash, created_at))
        except Exception as e:
            print(f"  Error fetching tx {tx_hash[:12]}: {e}")

    if seen_ledgers:
        print(f"\nLedgers found: {[l for l,_,_ in seen_ledgers]}")
        print("\nTo query state BEFORE a specific tx, run:")
        print(f"  python3 {__file__} <ledger_number>")

# ── Step 4: If ledger arg given, query historical state ───────────────────────
if len(sys.argv) > 1:
    target_ledger = int(sys.argv[1])
    print(f"\n{'='*60}")
    print(f"Querying contract state at ledger {target_ledger}...")
    print("="*60)
    try:
        key_xdr = get_contract_instance_key_xdr(STAKING_CONTRACT)
        resp = rpc("getLedgerEntries", {"keys": [key_xdr], "ledger": target_ledger})
        entries = resp.get("result", {}).get("entries", [])
        decode_reward_state(entries)
    except Exception as e:
        print(f"Error: {e}")
        import traceback; traceback.print_exc()
