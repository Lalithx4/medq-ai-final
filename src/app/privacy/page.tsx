import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | BioDocs.ai",
  description: "Privacy Policy for BioDocs.ai - AI-powered biomedical research platform",
};

export default function PrivacyPolicy() {
  const lastUpdated = "December 4, 2024";
  const contactEmail = "privacy@biodocs.ai";
  const companyName = "BioDocs.ai";
  const websiteUrl = "https://www.biodocs.ai";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-slate-800 dark:text-white">Bio</span>
            <span className="text-blue-600">Docs</span>
            <span className="text-purple-600">.ai</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <article className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Privacy Policy</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Last Updated: {lastUpdated}</p>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Introduction</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Welcome to {companyName} ("{companyName}", "we", "us", or "our"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered biomedical research platform and related services (collectively, the "Service").
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                By accessing or using our Service, you agree to this Privacy Policy. If you do not agree with the terms of this Privacy Policy, please do not access or use the Service.
              </p>
            </section>

            {/* Information We Collect */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">2.1 Information You Provide</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-2">
                <li><strong>Account Information:</strong> When you create an account, we collect your name, email address, and profile picture through Google OAuth authentication.</li>
                <li><strong>User Content:</strong> Documents, research papers, presentations, and other content you create, upload, or generate using our Service.</li>
                <li><strong>Communications:</strong> Information you provide when you contact us for support or feedback.</li>
                <li><strong>Payment Information:</strong> If you subscribe to premium features, we collect billing information through our secure payment processors (Stripe, PayPal, Razorpay). We do not store complete credit card numbers on our servers.</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">2.2 Information Collected Automatically</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-2">
                <li><strong>Usage Data:</strong> Information about how you interact with our Service, including features used, time spent, and actions taken.</li>
                <li><strong>Device Information:</strong> Browser type, operating system, device identifiers, and IP address.</li>
                <li><strong>Cookies and Similar Technologies:</strong> We use cookies and similar tracking technologies to enhance your experience and analyze usage patterns.</li>
                <li><strong>Log Data:</strong> Server logs that record your interactions with our Service.</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">2.3 Information from Third Parties</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li><strong>Google OAuth:</strong> When you sign in with Google, we receive your basic profile information (name, email, profile picture) as authorized by you.</li>
                <li><strong>Research Databases:</strong> We access publicly available research databases (PubMed, arXiv) to provide citation and research features.</li>
              </ul>
            </section>

            {/* How We Use Your Information */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li>Provide, maintain, and improve our Service</li>
                <li>Process your requests and transactions</li>
                <li>Generate AI-powered content, including research papers, presentations, and citations</li>
                <li>Personalize your experience and provide relevant recommendations</li>
                <li>Communicate with you about updates, security alerts, and support</li>
                <li>Analyze usage patterns to improve our Service</li>
                <li>Detect, prevent, and address technical issues and security threats</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            {/* Data Sharing */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. How We Share Your Information</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">We do not sell your personal information. We may share your information in the following circumstances:</p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li><strong>Service Providers:</strong> With third-party vendors who assist us in operating our Service (cloud hosting, payment processing, analytics).</li>
                <li><strong>AI Processing:</strong> Your content may be processed by AI providers (OpenAI, Google AI, Cerebras) to generate responses. We use enterprise-grade APIs with data protection agreements.</li>
                <li><strong>Legal Requirements:</strong> When required by law, legal process, or government request.</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
                <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information.</li>
              </ul>
            </section>

            {/* Data Security */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Data Security</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We implement industry-standard security measures to protect your information, including:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li>Encryption of data in transit (TLS/SSL) and at rest</li>
                <li>Secure authentication through OAuth 2.0</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and employee training</li>
                <li>Secure cloud infrastructure with SOC 2 compliant providers</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 mt-4">
                However, no method of transmission over the Internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            {/* Data Retention */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Data Retention</h2>
              <p className="text-gray-600 dark:text-gray-300">
                We retain your personal information for as long as your account is active or as needed to provide you with our Service. You may request deletion of your account and associated data at any time by contacting us at {contactEmail}. Some information may be retained for legal, security, or business purposes.
              </p>
            </section>

            {/* Your Rights */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Your Rights and Choices</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">Depending on your location, you may have the following rights:</p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Request a portable copy of your data</li>
                <li><strong>Opt-out:</strong> Opt out of marketing communications</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent where processing is based on consent</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 mt-4">
                To exercise these rights, please contact us at {contactEmail}.
              </p>
            </section>

            {/* Cookies */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. Cookies and Tracking Technologies</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">We use cookies and similar technologies for:</p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li><strong>Essential Cookies:</strong> Required for the Service to function properly (authentication, security)</li>
                <li><strong>Analytics Cookies:</strong> To understand how users interact with our Service</li>
                <li><strong>Preference Cookies:</strong> To remember your settings and preferences</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 mt-4">
                You can control cookies through your browser settings. Disabling certain cookies may affect the functionality of our Service.
              </p>
            </section>

            {/* International Transfers */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. International Data Transfers</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your information in accordance with applicable data protection laws.
              </p>
            </section>

            {/* Children's Privacy */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. Children's Privacy</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Our Service is not intended for children under 16 years of age. We do not knowingly collect personal information from children under 16. If you believe we have collected information from a child under 16, please contact us immediately at {contactEmail}.
              </p>
            </section>

            {/* Changes to Policy */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">11. Changes to This Privacy Policy</h2>
              <p className="text-gray-600 dark:text-gray-300">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. Your continued use of the Service after any changes constitutes your acceptance of the updated Privacy Policy.
              </p>
            </section>

            {/* Contact */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">12. Contact Us</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                <p className="text-gray-700 dark:text-gray-200"><strong>{companyName}</strong></p>
                <p className="text-gray-600 dark:text-gray-300">Email: {contactEmail}</p>
                <p className="text-gray-600 dark:text-gray-300">Website: {websiteUrl}</p>
              </div>
            </section>

            {/* GDPR Specific */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">13. Additional Information for EEA/UK Users</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                If you are located in the European Economic Area (EEA) or United Kingdom (UK), you have additional rights under the General Data Protection Regulation (GDPR):
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li><strong>Legal Basis:</strong> We process your data based on consent, contract performance, legitimate interests, or legal obligations.</li>
                <li><strong>Data Protection Officer:</strong> You may contact our data protection team at {contactEmail}.</li>
                <li><strong>Supervisory Authority:</strong> You have the right to lodge a complaint with your local data protection authority.</li>
              </ul>
            </section>

            {/* CCPA Specific */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">14. Additional Information for California Residents</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Under the California Consumer Privacy Act (CCPA), California residents have additional rights:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li><strong>Right to Know:</strong> Request information about the categories and specific pieces of personal information we have collected.</li>
                <li><strong>Right to Delete:</strong> Request deletion of your personal information.</li>
                <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your privacy rights.</li>
                <li><strong>Do Not Sell:</strong> We do not sell your personal information to third parties.</li>
              </ul>
            </section>
          </div>
        </article>

        {/* Footer Links */}
        <div className="mt-8 text-center">
          <Link href="/terms" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 mr-6">
            Terms of Service
          </Link>
          <Link href="/" className="text-gray-600 hover:text-gray-700 dark:text-gray-400">
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
