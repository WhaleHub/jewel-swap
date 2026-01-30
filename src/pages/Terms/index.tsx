const Terms = () => {
  return (
    <div className="w-full mt-[56px] md:mt-[64px] px-[10.5px]">
      <div className="max-w-[800px] mx-auto py-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">
          Terms & Conditions
        </h1>
        <p className="text-[#B1B3B8] mb-8">Last updated: January 24, 2025</p>

        <div className="space-y-8 text-[#E1E3E8]">
          <section>
            <h2 className="text-xl font-semibold mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="leading-relaxed">
              By accessing or using WhaleHub, you agree to be bound by these
              Terms and Conditions. If you do not agree with any part of these
              terms, you must not use the protocol.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              2. Decentralized Protocol Nature
            </h2>
            <p className="leading-relaxed">
              WhaleHub operates autonomously through smart contracts deployed on
              public blockchains. The operators do not control user funds,
              transactions, or wallet behavior. Users bear full responsibility
              for their interactions with the protocol.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              3. No Financial Advice
            </h2>
            <p className="leading-relaxed">
              The protocol provides no financial, investment, legal, or tax
              guidance. All information presented is for informational purposes
              only. Users must independently assess all risks and determine the
              suitability of any actions they take.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              4. Risk Acknowledgment
            </h2>
            <p className="leading-relaxed mb-4">
              By using WhaleHub, you acknowledge and accept the following risks:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Smart contract vulnerabilities and potential exploits</li>
              <li>Blockchain network failures or congestion</li>
              <li>Cryptocurrency price volatility</li>
              <li>Liquidity concerns and impermanent loss</li>
              <li>Oracle malfunctions or data inaccuracies</li>
              <li>Governance changes affecting protocol behavior</li>
              <li>Regulatory shifts in various jurisdictions</li>
            </ul>
            <p className="leading-relaxed mt-4">
              The service is offered "as is" and "as available" without any
              warranties of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              5. Absence of Guarantees
            </h2>
            <p className="leading-relaxed">
              WhaleHub makes no promises or guarantees regarding yields,
              returns, availability, or stability of the protocol. Historical
              performance does not predict or guarantee future outcomes. Past
              results should not be taken as an indication of future
              performance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. User Obligations</h2>
            <p className="leading-relaxed mb-4">As a user, you agree to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Secure your own wallets and private keys</li>
              <li>Understand the mechanics of the protocol before use</li>
              <li>Verify all transactions before signing</li>
              <li>Comply with all applicable laws in your jurisdiction</li>
            </ul>
            <p className="leading-relaxed mt-4">
              Losses caused by user error, negligence, or failure to follow
              security best practices cannot be recovered.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              7. Protocol Modifications
            </h2>
            <p className="leading-relaxed">
              The protocol operators may upgrade, migrate, pause, or discontinue
              components of the protocol without prior notice when necessary for
              security, technical, or operational reasons. Users should stay
              informed about protocol updates through official channels.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              8. Regulatory Environment
            </h2>
            <p className="leading-relaxed">
              Users are solely responsible for determining compliance with all
              applicable laws and regulations in their jurisdiction.
              Cryptocurrency regulations vary by location, and it is your
              responsibility to ensure your use of the protocol is lawful.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              9. Limitation of Liability
            </h2>
            <p className="leading-relaxed">
              To the maximum extent permitted by law, the protocol operators
              bear no liability for any losses arising from protocol usage,
              smart contract failures, blockchain issues, or any related
              damages. This includes direct, indirect, incidental, special,
              consequential, or punitive damages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              10. Governing Framework
            </h2>
            <p className="leading-relaxed">
              These Terms follow decentralized protocol principles and are not
              governed by any specific national legal framework. Disputes should
              be resolved through community governance mechanisms where
              applicable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">11. Term Updates</h2>
            <p className="leading-relaxed">
              We reserve the right to modify these Terms at any time. Continued
              use of the protocol after changes are posted signifies your
              acceptance of the modified terms. Please review these Terms
              periodically for updates.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">12. Contact</h2>
            <p className="leading-relaxed">
              For questions about these Terms, please reach out through our
              community channels on{" "}
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

export default Terms;
