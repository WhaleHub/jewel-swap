#!/usr/bin/env python3
"""
Build, sign (master key), copy to clipboard — admin_emergency_reset_rewards.
Drains all BLUB from staking contract back to admin, resets reward accumulator to 0.
"""

import sys, os, tomllib, urllib.parse, subprocess

from stellar_sdk import Keypair, Network, TransactionBuilder, StrKey, SorobanServer
from stellar_sdk.operation import InvokeHostFunction
from stellar_sdk import xdr as xdr_

# ── Config ───────────────────────────────────────────────────────────────
STAKING_CONTRACT   = "CC72BEVVKHQ57PB5FCKAZYRXCSR6DOQSTN46QR7RZMMM64YWNRPDS24S"
MULTISIG_ADMIN     = "GALE4XON37AQ4KFTJKB3W32BUQGXFE46TQLKUIGBSIHSOEHTDBMKEI3M"
RPC_URL            = "https://soroban-rpc.mainnet.stellar.gateway.fm"
NETWORK_PASSPHRASE = Network.PUBLIC_NETWORK_PASSPHRASE
MAX_FEE            = 1_000_000

CORRECT_REWARD_PER_TOKEN    = 0
CORRECT_TOTAL_REWARDS_ADDED = 0

# ── Load master key ──────────────────────────────────────────────────────
identity_path = os.path.expanduser("~/.config/stellar/identity/multisig-admin.toml")
try:
    with open(identity_path, "rb") as f:
        master_secret = tomllib.load(f).get("secret_key")
    master_kp = Keypair.from_secret(master_secret)
    print(f"Master key: {master_kp.public_key}")
except Exception as e:
    secret = os.environ.get("MASTER_SECRET", "")
    if not secret:
        print(f"Load failed: {e}. Set MASTER_SECRET."); sys.exit(1)
    master_kp = Keypair.from_secret(secret)

# ── Build ScVals ─────────────────────────────────────────────────────────
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

def i128_scval(value: int) -> xdr_.SCVal:
    if value < 0:
        v = value + (1 << 128)
    else:
        v = value
    hi = (v >> 64) & 0xFFFFFFFFFFFFFFFF
    lo = v & 0xFFFFFFFFFFFFFFFF
    if hi >= (1 << 63):
        hi -= (1 << 64)
    return xdr_.SCVal(
        xdr_.SCValType.SCV_I128,
        i128=xdr_.Int128Parts(hi=xdr_.Int64(hi), lo=xdr_.Uint64(lo)),
    )

contract_addr = xdr_.SCAddress(
    xdr_.SCAddressType.SC_ADDRESS_TYPE_CONTRACT,
    contract_id=xdr_.Hash(StrKey.decode_contract(STAKING_CONTRACT)),
)

host_function = xdr_.HostFunction(
    type=xdr_.HostFunctionType.HOST_FUNCTION_TYPE_INVOKE_CONTRACT,
    invoke_contract=xdr_.InvokeContractArgs(
        contract_address=contract_addr,
        function_name=xdr_.SCSymbol(b"admin_emergency_reset_rewards"),
        args=[
            account_scval(MULTISIG_ADMIN),
            i128_scval(CORRECT_REWARD_PER_TOKEN),
            i128_scval(CORRECT_TOTAL_REWARDS_ADDED),
        ],
    ),
)

invoke_op = InvokeHostFunction(host_function=host_function, auth=[])

# ── Build, simulate, sign ────────────────────────────────────────────────
server = SorobanServer(RPC_URL)
account = server.load_account(MULTISIG_ADMIN)

tx = (
    TransactionBuilder(account, network_passphrase=NETWORK_PASSPHRASE, base_fee=MAX_FEE)
    .append_operation(invoke_op)
    .set_timeout(300)
    .build()
)

print("Simulating...")
try:
    tx = server.prepare_transaction(tx)
    print("Simulation OK.")
except Exception as e:
    print(f"Simulation failed: {e}")
    # Get raw sim result for debugging
    try:
        raw = server.simulate_transaction(tx)
        print(f"Raw sim error: {getattr(raw, 'error', raw)}")
    except Exception as e2:
        print(f"Raw sim also failed: {e2}")
    sys.exit(1)

tx.sign(master_kp)
xdr = tx.to_xdr()

subprocess.run(["pbcopy"], input=xdr.encode(), check=True)
print()
print("=" * 70)
print("admin_emergency_reset_rewards — SIGNED, XDR IN CLIPBOARD")
print("=" * 70)
print("Drains ALL BLUB from contract → admin, resets reward_per_token=0")
print()
print("✅ XDR in clipboard — paste at https://lab.stellar.org/transaction/sign?network=mainnet")
print()
print("After co-founder signs, submit:")
print('  stellar tx send --network mainnet "<FINAL_XDR>"')
