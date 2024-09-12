import * as StellarSdk from "@stellar/stellar-sdk";

enum HORIZON_SERVER {
  stellar = "https://horizon.stellar.org",
}

export class StellarService {
  server: StellarSdk.Horizon.Server | null = null;

  constructor() {
    this.startHorizonServer();
  }

  private startHorizonServer(): void {
    // @ts-ignore
    // settled in configs: prod.js and dev.js
    // this.server = new StellarSdk.Horizon.Server(process.horizon.HORIZON_SERVER);
    this.server = new StellarSdk.Horizon.Server(HORIZON_SERVER.stellar);
  }

  loadAccount(publicKey: string): Promise<StellarSdk.Horizon.AccountResponse> {
    if (!this.server) {
      throw new Error("Horizon server isn't started");
    }
    return this.server.loadAccount(publicKey);
  }
}
