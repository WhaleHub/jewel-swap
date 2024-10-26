import {
  isConnected,
  getPublicKey,
  signTransaction,
} from "@lobstrco/signer-extension-api";
import * as StellarSdk from "@stellar/stellar-sdk";

export default class LobstrExtensionServiceClass {
  get isConnected(): Promise<boolean> {
    return isConnected();
  }

  async login() {
    const publicKey = await getPublicKey();
    console.log(publicKey);
  }

  async signTx(tx: StellarSdk.Transaction): Promise<StellarSdk.Transaction> {
    const signedXDR = await signTransaction(tx.toEnvelope().toXDR("base64"));

    return new StellarSdk.Transaction(signedXDR, StellarSdk.Networks.PUBLIC);
  }
}
