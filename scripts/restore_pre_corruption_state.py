#!/usr/bin/env python3
"""
Restore staking contract reward state to pre-corruption values.

SEQUENCE (run in order, wait for each tx to confirm before next):
  python3 scripts/restore_pre_corruption_state.py phase1   # reset accumulator
  python3 scripts/restore_pre_corruption_state.py phase2a  # grant BLUB SAC admin → blub-issuer-v2
  python3 scripts/restore_pre_corruption_state.py phase2b  # mint BLUB to staking contract
  python3 scripts/restore_pre_corruption_state.py phase2c  # restore BLUB SAC admin → staking contract

Phases 1, 2a, 2c → multisig (needs co-founder second signature).
Phase 2b          → single-key (blub-issuer-v2 manager, no co-founder needed).

PRE-CORRUPTION VALUES (verify against get_pre_corruption_state.py before running):
  reward_per_token_stored = 2_385_537_997
  total_rewards_added     ≈ 568_330_000_000 stroops  (≈56,833 BLUB)
  total_rewards_claimed   ≈ 255_120_000_000 stroops  (≈25,512 BLUB)
  unclaimed_blub          ≈ 313_210_000_000 stroops  (≈31,321 BLUB)

IMPORTANT: Confirm exact total_rewards_added and unclaimed_blub from the chain read
           (run get_pre_corruption_state.py with the target ledger number first).
"""

import sys, os, tomllib, urllib.parse, subprocess

from stellar_sdk import Keypair, Network, TransactionBuilder, StrKey, SorobanServer
from stellar_sdk.operation import InvokeHostFunction
from stellar_sdk import xdr as xdr_

# ── Pre-corruption values — VERIFY BEFORE RUNNING ───────────────────────────
# Read from chain at pre-corruption ledger via get_pre_corruption_state.py
CORRECT_REWARD_PER_TOKEN    = 2_385_537_997
CORRECT_TOTAL_REWARDS_ADDED = 568_330_000_000   # stroops; ≈ 56,833 BLUB — VERIFY
UNCLAIMED_BLUB_STROOPS      = 313_210_000_000   # stroops; ≈ 31,321 BLUB — VERIFY
# ── Contract / account addresses ────────────────────────────────────────────
STAKING_CONTRACT   = "CC72BEVVKHQ57PB5FCKAZYRXCSR6DOQSTN46QR7RZMMM64YWNRPDS24S"
BLUB_SAC_CONTRACT  = "CBMFDIRY5OKI4JJURXC4SMEQPWB4UUADIADJK4NA6CYBNOYK4W4TMLLF"
MULTISIG_ADMIN     = "GALE4XON37AQ4KFTJKB3W32BUQGXFE46TQLKUIGBSIHSOEHTDBMKEI3M"
MANAGER_ACCOUNT    = "GDERSSCKJQPPXUQOZIOXGRVAGNLVPVZCJ2MAX7RCMVMWGRPVAEG7XGTK"  # blub-issuer-v2
# ── Network ──────────────────────────────────────────────────────────────────
RPC_URL            = "https://soroban-rpc.mainnet.stellar.gateway.fm"
NETWORK_PASSPHRASE = Network.PUBLIC_NETWORK_PASSPHRASE
MAX_FEE            = 1_000_000

PHASE = sys.argv[1] if len(sys.argv) > 1 else ""
if PHASE not in ("phase1", "phase2a", "phase2b", "phase2c"):
    print(__doc__)
    print("Usage: python3 restore_pre_corruption_state.py <phase1|phase2a|phase2b|phase2c>")
    sys.exit(1)

# ── XDR helpers ──────────────────────────────────────────────────────────────
def account_scval(pub_key: str) -> xdr_.SCVal:
    return xdr_.SCVal(
        xdr_.SCValType.SCV_ADDRESS,
        address=xdr_.SCAddress(
            xdr_.SCAddressType.SC_ADDRESS_TYPE_ACCOUNT,
            account_id=xdr_.AccountID(xdr_.PublicKey(
                xdr_.PublicKeyType.PUBLIC_KEY_TYPE_ED25519,
                ed25519=xdr_.Uint256(StrKey.decode_ed25519_public_key(pub_key)),
            )),
        ),
    )

def contract_scval(contract_address: str) -> xdr_.SCVal:
    return xdr_.SCVal(
        xdr_.SCValType.SCV_ADDRESS,
        address=xdr_.SCAddress(
            xdr_.SCAddressType.SC_ADDRESS_TYPE_CONTRACT,
            contract_id=xdr_.Hash(StrKey.decode_contract(contract_address)),
        ),
    )

def i128_scval(value: int) -> xdr_.SCVal:
    v = value + (1 << 128) if value < 0 else value
    hi = (v >> 64) & 0xFFFFFFFFFFFFFFFF
    lo = v & 0xFFFFFFFFFFFFFFFF
    if hi >= (1 << 63):
        hi -= (1 << 64)
    return xdr_.SCVal(
        xdr_.SCValType.SCV_I128,
        i128=xdr_.Int128Parts(hi=xdr_.Int64(hi), lo=xdr_.Uint64(lo)),
    )

def i64_scval(value: int) -> xdr_.SCVal:
    return xdr_.SCVal(xdr_.SCValType.SCV_I64, i64=xdr_.Int64(value))

def invoke_fn(contract_address: str, fn_name: str, args: list) -> xdr_.HostFunction:
    return xdr_.HostFunction(
        type=xdr_.HostFunctionType.HOST_FUNCTION_TYPE_INVOKE_CONTRACT,
        invoke_contract=xdr_.InvokeContractArgs(
            contract_address=xdr_.SCAddress(
                xdr_.SCAddressType.SC_ADDRESS_TYPE_CONTRACT,
                contract_id=xdr_.Hash(StrKey.decode_contract(contract_address)),
            ),
            function_name=xdr_.SCSymbol(fn_name.encode()),
            args=args,
        ),
    )

def build_sign_and_copy(source_account: str, keypair: Keypair, host_function: xdr_.HostFunction):
    """Simulate, sign with keypair, copy XDR to clipboard."""
    server = SorobanServer(RPC_URL)
    account = server.load_account(source_account)
    tx = (
        TransactionBuilder(account, network_passphrase=NETWORK_PASSPHRASE, base_fee=MAX_FEE)
        .append_operation(InvokeHostFunction(host_function=host_function, auth=[]))
        .set_timeout(300)
        .build()
    )
    print("Simulating...")
    try:
        tx = server.prepare_transaction(tx)
        print("Simulation OK.")
    except Exception as e:
        print(f"Simulation failed: {e}")
        try:
            raw = server.simulate_transaction(tx)
            print(f"Raw sim error: {getattr(raw, 'error', raw)}")
        except Exception as e2:
            print(f"Raw sim also failed: {e2}")
        sys.exit(1)
    tx.sign(keypair)
    xdr_str = tx.to_xdr()
    subprocess.run(["pbcopy"], input=xdr_str.encode(), check=True)
    return xdr_str

# ── Load keys ────────────────────────────────────────────────────────────────
def load_multisig_key() -> Keypair:
    path = os.path.expanduser("~/.config/stellar/identity/multisig-admin.toml")
    try:
        with open(path, "rb") as f:
            secret = tomllib.load(f).get("secret_key")
        kp = Keypair.from_secret(secret)
        print(f"Multisig master key: {kp.public_key}")
        return kp
    except Exception as e:
        secret = os.environ.get("MASTER_SECRET", "")
        if not secret:
            print(f"Cannot load multisig key: {e}. Set MASTER_SECRET env var.")
            sys.exit(1)
        kp = Keypair.from_secret(secret)
        print(f"Multisig master key (env): {kp.public_key}")
        return kp

def load_manager_key() -> Keypair:
    path = os.path.expanduser("~/.config/stellar/identity/blub-issuer-v2.toml")
    try:
        with open(path, "rb") as f:
            data = tomllib.load(f)
        secret = data.get("secret_key")
        if not secret:
            phrase = data.get("seed_phrase", "")
            kp = Keypair.from_mnemonic_phrase(phrase)
        else:
            kp = Keypair.from_secret(secret)
        print(f"Manager key: {kp.public_key}")
        return kp
    except Exception as e:
        secret = os.environ.get("MANAGER_SECRET", "")
        if not secret:
            print(f"Cannot load manager key: {e}. Set MANAGER_SECRET env var.")
            sys.exit(1)
        kp = Keypair.from_secret(secret)
        print(f"Manager key (env): {kp.public_key}")
        return kp

# ════════════════════════════════════════════════════════════════════════════
# PHASE 1 — admin_emergency_reset_rewards with pre-corruption values
# ════════════════════════════════════════════════════════════════════════════
if PHASE == "phase1":
    print("=" * 70)
    print("PHASE 1: admin_emergency_reset_rewards (pre-corruption values)")
    print("=" * 70)
    print(f"  reward_per_token_stored  = {CORRECT_REWARD_PER_TOKEN}")
    print(f"  total_rewards_added      = {CORRECT_TOTAL_REWARDS_ADDED} stroops")
    print(f"  (burns all BLUB currently in staking contract — expected: 0)")
    print()

    kp = load_multisig_key()
    hf = invoke_fn(
        STAKING_CONTRACT,
        "admin_emergency_reset_rewards",
        [
            account_scval(MULTISIG_ADMIN),
            i128_scval(CORRECT_REWARD_PER_TOKEN),
            i128_scval(CORRECT_TOTAL_REWARDS_ADDED),
        ],
    )
    xdr_str = build_sign_and_copy(MULTISIG_ADMIN, kp, hf)
    link = "https://lab.stellar.org/transaction/sign?network=mainnet&xdr=" + urllib.parse.quote(xdr_str)
    print()
    print("✅ XDR in clipboard — paste at https://lab.stellar.org/transaction/sign?network=mainnet")
    print()
    print("Co-founder signing link:")
    print(f"  {link}")
    print()
    print("After co-founder signs and tx confirms, run PHASE 2a.")

# ════════════════════════════════════════════════════════════════════════════
# PHASE 2a — update_sac_admin: staking_contract → blub-issuer-v2
# ════════════════════════════════════════════════════════════════════════════
elif PHASE == "phase2a":
    print("=" * 70)
    print("PHASE 2a: update_sac_admin → blub-issuer-v2 (so manager can mint)")
    print("=" * 70)
    print(f"  new BLUB SAC admin: {MANAGER_ACCOUNT} (blub-issuer-v2)")
    print()

    kp = load_multisig_key()
    hf = invoke_fn(
        STAKING_CONTRACT,
        "update_sac_admin",
        [
            account_scval(MULTISIG_ADMIN),
            account_scval(MANAGER_ACCOUNT),
        ],
    )
    xdr_str = build_sign_and_copy(MULTISIG_ADMIN, kp, hf)
    link = "https://lab.stellar.org/transaction/sign?network=mainnet&xdr=" + urllib.parse.quote(xdr_str)
    print()
    print("✅ XDR in clipboard — paste at https://lab.stellar.org/transaction/sign?network=mainnet")
    print()
    print("Co-founder signing link:")
    print(f"  {link}")
    print()
    print("After co-founder signs and tx confirms, run PHASE 2b.")

# ════════════════════════════════════════════════════════════════════════════
# PHASE 2b — mint BLUB to staking contract (manager single-key, no co-founder)
# ════════════════════════════════════════════════════════════════════════════
elif PHASE == "phase2b":
    print("=" * 70)
    print("PHASE 2b: mint BLUB to staking contract (blub-issuer-v2, no multisig)")
    print("=" * 70)
    print(f"  mint amount : {UNCLAIMED_BLUB_STROOPS} stroops")
    print(f"              = {UNCLAIMED_BLUB_STROOPS / 1e7:.7f} BLUB")
    print(f"  to          : {STAKING_CONTRACT} (staking contract)")
    print()

    kp = load_manager_key()
    # SAC mint(to: Address, amount: i128)
    hf = invoke_fn(
        BLUB_SAC_CONTRACT,
        "mint",
        [
            contract_scval(STAKING_CONTRACT),
            i128_scval(UNCLAIMED_BLUB_STROOPS),
        ],
    )

    server = SorobanServer(RPC_URL)
    account = server.load_account(MANAGER_ACCOUNT)
    tx = (
        TransactionBuilder(account, network_passphrase=NETWORK_PASSPHRASE, base_fee=MAX_FEE)
        .append_operation(InvokeHostFunction(host_function=hf, auth=[]))
        .set_timeout(300)
        .build()
    )
    print("Simulating...")
    try:
        tx = server.prepare_transaction(tx)
        print("Simulation OK.")
    except Exception as e:
        print(f"Simulation failed: {e}")
        try:
            raw = server.simulate_transaction(tx)
            print(f"Raw sim error: {getattr(raw, 'error', raw)}")
        except Exception as e2:
            print(f"Raw sim also failed: {e2}")
        sys.exit(1)
    tx.sign(kp)
    xdr_str = tx.to_xdr()
    subprocess.run(["pbcopy"], input=xdr_str.encode(), check=True)

    print()
    print("✅ XDR in clipboard — submit directly (no co-founder needed):")
    print('  stellar tx send --network mainnet "<paste XDR here>"')
    print()
    print("Or use Stellar Lab (Import XDR → Sign → Submit):")
    print("  https://lab.stellar.org/transaction/sign?network=mainnet")
    print()
    print("After tx confirms, run PHASE 2c.")

# ════════════════════════════════════════════════════════════════════════════
# PHASE 2c — update_sac_admin: blub-issuer-v2 → staking_contract (restore)
# ════════════════════════════════════════════════════════════════════════════
elif PHASE == "phase2c":
    print("=" * 70)
    print("PHASE 2c: BLUB SAC set_admin → staking contract (blub-issuer-v2 direct call)")
    print("=" * 70)
    print(f"  new BLUB SAC admin: {STAKING_CONTRACT} (staking contract)")
    print(f"  called by: {MANAGER_ACCOUNT} (blub-issuer-v2, current SAC admin)")
    print()

    # blub-issuer-v2 is the current BLUB SAC admin (after Phase 2a).
    # Call set_admin directly on the SAC — no need to go through the staking contract.
    kp = load_manager_key()
    hf = invoke_fn(
        BLUB_SAC_CONTRACT,
        "set_admin",
        [contract_scval(STAKING_CONTRACT)],
    )

    server = SorobanServer(RPC_URL)
    account = server.load_account(MANAGER_ACCOUNT)
    tx = (
        TransactionBuilder(account, network_passphrase=NETWORK_PASSPHRASE, base_fee=MAX_FEE)
        .append_operation(InvokeHostFunction(host_function=hf, auth=[]))
        .set_timeout(300)
        .build()
    )
    print("Simulating...")
    try:
        tx = server.prepare_transaction(tx)
        print("Simulation OK.")
    except Exception as e:
        print(f"Simulation failed: {e}")
        try:
            raw = server.simulate_transaction(tx)
            print(f"Raw sim error: {getattr(raw, 'error', raw)}")
        except Exception as e2:
            print(f"Raw sim also failed: {e2}")
        sys.exit(1)
    tx.sign(kp)
    xdr_str = tx.to_xdr()
    subprocess.run(["pbcopy"], input=xdr_str.encode(), check=True)
    print()
    print("✅ XDR in clipboard — submit directly (no co-founder needed):")
    print('  stellar tx send --network mainnet "<paste XDR here>"')
    print()
    print("After tx confirms, restoration is COMPLETE.")
    print()
    print("Verify final state:")
    print("  python3 scripts/get_pre_corruption_state.py")
    print(f"  Expected reward_per_token_stored : {CORRECT_REWARD_PER_TOKEN}")
    print(f"  Expected total_rewards_added     : {CORRECT_TOTAL_REWARDS_ADDED}")
    print(f"  Expected BLUB in contract        : {UNCLAIMED_BLUB_STROOPS} stroops")
