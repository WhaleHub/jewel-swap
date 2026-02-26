#!/usr/bin/env python3
"""
Claim all claimable balances for blub-issuer-v2
(GDERSSCKJQPPXUQOZIOXGRVAGNLVPVZCJ2MAX7RCMVMWGRPVAEG7XGTK)

Usage:
  DRY_RUN=1 python3 claim_balances.py          # preview only
  SECRET_KEY=SC... python3 claim_balances.py   # live submit (prompts if not set)
"""

import os
import sys
import requests
import getpass
from stellar_sdk import (
    Keypair,
    Server,
    Network,
    TransactionBuilder,
)

ACCOUNT = "GDERSSCKJQPPXUQOZIOXGRVAGNLVPVZCJ2MAX7RCMVMWGRPVAEG7XGTK"
HORIZON_URL = "https://horizon.stellar.org"
BATCH_SIZE = 80  # max 100 ops per tx; use 80 to be safe


def fetch_all_claimable_balances(account: str) -> list[dict]:
    """Page through all claimable balances for the given account."""
    url = f"{HORIZON_URL}/claimable_balances"
    params = {"claimant": account, "limit": 200, "order": "asc"}
    records = []
    while url:
        resp = requests.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
        batch = data.get("_embedded", {}).get("records", [])
        records.extend(batch)
        # Follow next page link if present
        next_href = data.get("_links", {}).get("next", {}).get("href")
        if next_href and len(batch) == params.get("limit", 200):
            url = next_href
            params = {}  # already encoded in next_href
        else:
            break
    return records


def main():
    dry_run = os.environ.get("DRY_RUN", "").strip() in ("1", "true", "yes")
    secret_key = os.environ.get("SECRET_KEY", "").strip()

    print(f"Fetching claimable balances for {ACCOUNT} ...")
    records = fetch_all_claimable_balances(ACCOUNT)
    print(f"Found {len(records)} claimable balances\n")

    # Summarize by asset
    from collections import defaultdict
    totals: dict = defaultdict(float)
    for r in records:
        asset_name = r["asset"].split(":")[0]
        totals[asset_name] += float(r["amount"])

    print("Totals by asset:")
    for asset, total in sorted(totals.items()):
        count = sum(1 for r in records if r["asset"].split(":")[0] == asset)
        print(f"  {asset:15s}  {total:>20,.4f}  ({count} balances)")
    print()

    if dry_run:
        print("DRY_RUN=1 — showing balance IDs only, NOT submitting.\n")
        for i, r in enumerate(records, 1):
            asset = r["asset"].split(":")[0]
            print(f"  [{i:3d}] {r['id']}  ({asset} {r['amount']})")
        print("\nSet DRY_RUN=0 and provide SECRET_KEY to submit.")
        return

    # --- Live mode ---
    if not secret_key:
        secret_key = getpass.getpass("Enter SECRET_KEY for blub-issuer-v2: ")

    kp = Keypair.from_secret(secret_key)
    if kp.public_key != ACCOUNT:
        print(f"ERROR: Secret key does not match {ACCOUNT}")
        print(f"       Got public key: {kp.public_key}")
        sys.exit(1)

    server = Server(horizon_url=HORIZON_URL)
    account_obj = server.load_account(ACCOUNT)

    # Batch into chunks
    balance_ids = [r["id"] for r in records]
    batches = [balance_ids[i:i + BATCH_SIZE] for i in range(0, len(balance_ids), BATCH_SIZE)]
    print(f"Submitting {len(batches)} transaction(s), {BATCH_SIZE} ops max each...\n")

    for batch_num, batch in enumerate(batches, 1):
        print(f"--- Batch {batch_num}/{len(batches)} ({len(batch)} ops) ---")

        # Reload account to get fresh sequence number for each tx
        if batch_num > 1:
            account_obj = server.load_account(ACCOUNT)

        builder = TransactionBuilder(
            source_account=account_obj,
            network_passphrase=Network.PUBLIC_NETWORK_PASSPHRASE,
            base_fee=1000,  # 0.0001 XLM per op — safe for Stellar mainnet
        )
        builder.set_timeout(300)

        for bal_id in batch:
            builder.append_claim_claimable_balance_op(balance_id=bal_id)

        tx = builder.build()
        tx.sign(kp)

        try:
            response = server.submit_transaction(tx)
            print(f"  ✓ SUCCESS — hash: {response['hash']}")
            print(f"            https://stellar.expert/explorer/public/tx/{response['hash']}")
        except Exception as e:
            print(f"  ✗ FAILED: {e}")
            # Print details if available
            if hasattr(e, "extras") and e.extras:
                print(f"    result_codes: {e.extras.get('result_codes')}")
            # Don't stop — try next batch
        print()

    print("Done.")


if __name__ == "__main__":
    main()
