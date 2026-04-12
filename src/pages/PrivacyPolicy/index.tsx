const PrivacyPolicy = () => {
  return (
    <div className="w-full mt-[56px] md:mt-[64px] px-[10.5px]">
      <div className="max-w-[800px] mx-auto py-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">
          Privacy Policy
        </h1>
        <p className="text-[#B1B3B8] mb-8">Last updated: April 2026</p>

        <div className="space-y-8 text-[#E1E3E8]">
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Overview</h2>
            <p className="leading-relaxed">
              Whalehub operates as a decentralized, non-custodial protocol on the
              Stellar blockchain. The protocol does not maintain user accounts or
              require registration. This Privacy Policy explains how we collect,
              use, and protect information when you interact with our platform at
              app.whalehub.io (the &quot;Interface&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              2. No Custody and No Accounts
            </h2>
            <p className="leading-relaxed">
              The protocol does not custody funds, control private keys, or
              manage user accounts. Users authorize all interactions directly
              through their own blockchain wallets (e.g., Freighter, LOBSTR,
              xBull) without providing credentials to Whalehub.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              3. Information We Do Not Collect
            </h2>
            <p className="leading-relaxed mb-4">
              Whalehub explicitly does not collect:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Names, email addresses, or physical addresses</li>
              <li>Identification documents, biometric data, or KYC materials</li>
              <li>Financial account numbers or payment card details</li>
              <li>Social Security or government-issued identification numbers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. On-Chain Data</h2>
            <p className="leading-relaxed">
              When you interact with the Stellar blockchain through Whalehub,
              your transactions create public, immutable records including wallet
              addresses, transaction hashes, staking amounts, and reward claims.
              This data is inherent to blockchain technology and is neither
              created nor controlled by Whalehub. On-chain data cannot be
              modified or deleted by any party.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              5. Off-Chain Data We May Process
            </h2>
            <p className="leading-relaxed mb-4">
              When you use the Interface, we may process limited technical data:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <span className="font-medium">Technical Data:</span> IP
                addresses (not stored persistently), browser type and version,
                device information, operating system, and error logs. This data
                is used solely for security monitoring, abuse prevention, and
                debugging.
              </li>
              <li>
                <span className="font-medium">Usage Data:</span> With your
                consent, we collect anonymized analytics data including page
                views, session duration, and feature usage through Google
                Analytics. This helps us understand how users interact with the
                Interface so we can improve it. See Section 6 for details.
              </li>
              <li>
                <span className="font-medium">Support Communications:</span>{" "}
                Messages you send via Discord, Telegram, or other community
                channels. These remain on their respective platforms and are not
                aggregated or sold.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              6. Cookies and Analytics
            </h2>
            <p className="leading-relaxed mb-4">
              The Interface uses cookies and similar technologies. We use
              Cookiebot to manage your consent preferences.
            </p>
            <h3 className="text-lg font-medium mb-3">Types of Cookies</h3>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>
                <span className="font-medium">Strictly Necessary:</span>{" "}
                Essential for the Interface to function, including consent
                preference storage. These cannot be disabled.
              </li>
              <li>
                <span className="font-medium">Analytics / Statistics:</span>{" "}
                Used to understand how visitors interact with the Interface.
                We use Google Analytics (GA4) with IP anonymization enabled.
                These cookies are only set with your explicit consent.
              </li>
            </ul>
            <h3 className="text-lg font-medium mb-3">Google Analytics</h3>
            <p className="leading-relaxed mb-4">
              We use Google Analytics 4 (Measurement ID: G-P3DY3CMDL4) to
              collect anonymized usage statistics. Google Analytics uses cookies
              to generate statistical information about website usage. The data
              generated is transmitted to and stored by Google on servers in the
              United States. IP anonymization is enabled, meaning your IP address
              is truncated before transmission.
            </p>
            <h3 className="text-lg font-medium mb-3">Managing Your Preferences</h3>
            <p className="leading-relaxed">
              You can manage your cookie preferences at any time by clicking
              the cookie settings in the consent banner or adjusting your browser
              settings. You may also opt out of Google Analytics by installing
              the{" "}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00CC99] hover:underline"
              >
                Google Analytics Opt-out Browser Add-on
              </a>
              . Declining analytics cookies does not affect the functionality of
              the Interface.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              7. Third-Party Services
            </h2>
            <p className="leading-relaxed mb-4">
              The Interface integrates with the following third-party services,
              each operating under their own privacy policies:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <span className="font-medium">Wallet Providers:</span>{" "}
                Freighter, LOBSTR, xBull, and WalletConnect for transaction
                signing
              </li>
              <li>
                <span className="font-medium">RPC Providers:</span> Soroban RPC
                and Stellar Gateway for blockchain communication
              </li>
              <li>
                <span className="font-medium">Price Data:</span> CoinGecko API
                for token price information
              </li>
              <li>
                <span className="font-medium">Analytics:</span> Google Analytics
                (with consent) for anonymized usage data
              </li>
              <li>
                <span className="font-medium">Consent Management:</span>{" "}
                Cookiebot for cookie consent management
              </li>
              <li>
                <span className="font-medium">Hosting:</span> Netlify for
                Interface hosting and delivery
              </li>
            </ul>
            <p className="leading-relaxed mt-4">
              We are not responsible for the privacy practices of these
              third-party services. We encourage you to review their respective
              privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              8. How We Use Information
            </h2>
            <p className="leading-relaxed mb-4">
              The limited data we process is used to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide, maintain, and improve the Interface</li>
              <li>Monitor for security threats and abuse</li>
              <li>Debug technical issues and errors</li>
              <li>Understand aggregate usage patterns (with consent)</li>
              <li>Comply with applicable legal obligations</li>
            </ul>
            <p className="leading-relaxed mt-4">
              We do not sell, rent, or trade any user data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Data Retention</h2>
            <p className="leading-relaxed">
              Technical and server logs are retained for a maximum of 30 days.
              Analytics data is retained in anonymized, aggregated form for up
              to 14 months per Google Analytics default settings. On-chain
              blockchain data is permanent and immutable by nature. Support
              communications remain on their original platforms subject to those
              platforms&apos; retention policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Data Security</h2>
            <p className="leading-relaxed">
              We implement appropriate technical and organizational measures to
              protect data processed through the Interface, including encrypted
              connections (HTTPS/TLS), access controls, and regular security
              reviews. However, no method of electronic transmission or storage
              is completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              11. Your Rights (EEA/UK &mdash; GDPR)
            </h2>
            <p className="leading-relaxed mb-4">
              If you are located in the European Economic Area or United Kingdom,
              you have the following rights under the General Data Protection
              Regulation:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <span className="font-medium">Access:</span> Request a copy of
                any personal data we hold about you
              </li>
              <li>
                <span className="font-medium">Rectification:</span> Request
                correction of inaccurate personal data
              </li>
              <li>
                <span className="font-medium">Erasure:</span> Request deletion
                of your personal data (where applicable to off-chain data)
              </li>
              <li>
                <span className="font-medium">Restriction:</span> Request
                restriction of processing of your personal data
              </li>
              <li>
                <span className="font-medium">Portability:</span> Request
                transfer of your personal data in a structured format
              </li>
              <li>
                <span className="font-medium">Objection:</span> Object to
                processing of your personal data
              </li>
              <li>
                <span className="font-medium">Withdraw Consent:</span> Withdraw
                consent for analytics at any time via the cookie banner
              </li>
            </ul>
            <p className="leading-relaxed mt-4">
              Due to the decentralized nature of blockchain technology, on-chain
              data (wallet addresses, transaction records) cannot be modified or
              deleted by Whalehub or any party. These rights apply only to
              off-chain data within our control.
            </p>
            <p className="leading-relaxed mt-2">
              We will respond to verified requests within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              12. Your Rights (California &mdash; CCPA)
            </h2>
            <p className="leading-relaxed mb-4">
              California residents have additional rights under the California
              Consumer Privacy Act:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <span className="font-medium">Right to Know:</span> Request
                disclosure of categories and specific pieces of personal
                information collected
              </li>
              <li>
                <span className="font-medium">Right to Delete:</span> Request
                deletion of personal information (subject to blockchain
                limitations)
              </li>
              <li>
                <span className="font-medium">Right to Non-Discrimination:</span>{" "}
                You will not receive discriminatory treatment for exercising your
                rights
              </li>
            </ul>
            <p className="leading-relaxed mt-4">
              Whalehub does not sell personal information as defined under the
              CCPA.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              13. Children&apos;s Privacy
            </h2>
            <p className="leading-relaxed">
              The Interface is not directed at individuals under the age of 18.
              We do not knowingly collect personal data from children. If you
              believe a child has provided us with personal data, please contact
              us through the channels listed below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">14. Policy Changes</h2>
            <p className="leading-relaxed">
              We reserve the right to modify this Privacy Policy at any time. The
              &quot;Last updated&quot; date at the top of this page reflects the
              most recent revision. Continued use of the Interface after changes
              constitutes acceptance of the updated policy. We encourage you to
              review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">15. Contact</h2>
            <p className="leading-relaxed">
              For questions about this Privacy Policy, to exercise your data
              rights, or to report a privacy concern, please reach out through
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
