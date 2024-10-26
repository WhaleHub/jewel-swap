import { Horizon } from "@stellar/stellar-sdk";
import AccountRecord, * as StellarSdk from "@stellar/stellar-sdk";

export class AccountService extends Horizon.AccountResponse {
  constructor(account: typeof AccountRecord) {
    super(account);
  }
}
