const PrivacyPolicy = () => {
  return (
    <div className="w-full mt-[56px] md:mt-[64px] px-[10.5px]">
      <div className="max-w-[800px] mx-auto py-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">
          Privacy Policy
        </h1>
        <p className="text-[#B1B3B8] mb-8">Last updated: January 2025</p>

        <div className="space-y-8 text-[#E1E3E8]">
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Overview</h2>
            <p className="leading-relaxed">
              Whalehub operates as a decentralized, non-custodial protocol that
              doesn't maintain user accounts or require registration. This
              Privacy Policy explains how we handle information when you use our
              protocol.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              2. No Custody and No Accounts
            </h2>
            <p className="leading-relaxed">
              The protocol doesn't custody funds, control private keys, or
              manage user accounts. Users authorize interactions directly
              through their blockchain wallets without providing credentials.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              3. Information We Do Not Collect
            </h2>
            <p className="leading-relaxed">
              The platform explicitly avoids collecting names, addresses, or
              contact details and other sensitive data like identification
              documents, biometric information, or KYC materials.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. On-Chain Data</h2>
            <p className="leading-relaxed">
              Blockchain interactions create public records including wallet
              addresses and transaction hashes. This data is not created or
              controlled by us but maintained by the blockchain network itself.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              5. Off-Chain Data (Limited)
            </h2>
            <p className="leading-relaxed mb-4">Two categories exist:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <span className="font-medium">Technical Data:</span> IP
                addresses (temporary), browser information, and error logs for
                security purposes
              </li>
              <li>
                <span className="font-medium">Support Communications:</span>{" "}
                Messages from users on platforms like Discord or Twitter are
                seen but not aggregated or sold
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              6. Analytics and Tracking
            </h2>
            <p className="leading-relaxed">
              The platform doesn't use tracking cookies or behavioral analytics
              tools.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              7. Third-Party Services
            </h2>
            <p className="leading-relaxed">
              Wallet providers, RPC providers, and community platforms operate
              independently with separate privacy practices. We are not
              responsible for the practices of these third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Data Retention</h2>
            <p className="leading-relaxed">
              Technical data is kept only as needed; on-chain data remains
              permanent; support messages stay on their original platforms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. User Rights</h2>
            <p className="leading-relaxed">
              Users may request access to or deletion of off-chain data through
              community channels.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Policy Changes</h2>
            <p className="leading-relaxed">
              We reserve the right to modify this Privacy Policy at any time.
              Updates constitute binding changes upon continued use of the
              protocol. Please review this policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">11. Contact</h2>
            <p className="leading-relaxed">
              For questions about this Privacy Policy, please reach out through
              our community channels on{" "}
              <a
                href="https://discord.gg/fXmh8Y3cFn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00CC99] hover:underline"
              >
                Discord
              </a>{" "}
              or{" "}
              <a
                href="https://t.me/whalehubdefi"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00CC99] hover:underline"
              >
                Telegram
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
