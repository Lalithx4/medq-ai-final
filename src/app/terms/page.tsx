import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | BioDocs.ai",
  description: "Terms of Service for BioDocs.ai - AI-powered biomedical research platform",
};

export default function TermsOfService() {
  const lastUpdated = "December 4, 2024";
  const contactEmail = "legal@biodocs.ai";
  const supportEmail = "support@biodocs.ai";
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
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Terms of Service</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Last Updated: {lastUpdated}</p>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            {/* Agreement */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Agreement to Terms</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Welcome to {companyName}. These Terms of Service ("Terms") govern your access to and use of our website at {websiteUrl}, our AI-powered biomedical research platform, and all related services (collectively, the "Service").
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these Terms, you may not access or use the Service.
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                We reserve the right to modify these Terms at any time. We will notify you of any material changes by posting the updated Terms on this page. Your continued use of the Service after any changes constitutes your acceptance of the new Terms.
              </p>
            </section>

            {/* Description of Service */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Description of Service</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {companyName} provides an AI-powered platform designed for biomedical researchers, healthcare professionals, and students. Our Service includes:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li><strong>AI Research Assistant:</strong> Intelligent chat interface for research queries and document analysis</li>
                <li><strong>Presentation Builder:</strong> AI-generated medical and scientific presentations</li>
                <li><strong>Research Paper Writer:</strong> Assistance in drafting academic papers with citations</li>
                <li><strong>Citation Generator:</strong> Access to 280M+ academic sources for citation management</li>
                <li><strong>Document Editor:</strong> AI-enhanced document editing with paraphrasing and autocomplete</li>
                <li><strong>Literature Review:</strong> Comprehensive research synthesis tools</li>
                <li><strong>Video Conferencing:</strong> HIPAA-ready video meetings for medical professionals</li>
                <li><strong>File Management:</strong> Secure document storage and organization</li>
              </ul>
            </section>

            {/* Account Registration */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. Account Registration</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                To access certain features of our Service, you must create an account. When creating an account:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li>You must provide accurate, current, and complete information</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You are responsible for all activities that occur under your account</li>
                <li>You must notify us immediately of any unauthorized access or security breach</li>
                <li>You must be at least 16 years old to create an account</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 mt-4">
                We reserve the right to suspend or terminate accounts that violate these Terms or for any other reason at our sole discretion.
              </p>
            </section>

            {/* Acceptable Use */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Acceptable Use Policy</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">You agree NOT to use the Service to:</p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li>Violate any applicable laws, regulations, or third-party rights</li>
                <li>Generate, upload, or distribute harmful, fraudulent, or misleading content</li>
                <li>Create false or misleading medical, scientific, or academic content</li>
                <li>Plagiarize or misrepresent AI-generated content as entirely your own original work without proper disclosure</li>
                <li>Attempt to reverse engineer, decompile, or extract source code from our Service</li>
                <li>Interfere with or disrupt the integrity or performance of the Service</li>
                <li>Attempt to gain unauthorized access to any systems or networks</li>
                <li>Use automated means (bots, scrapers) to access the Service without permission</li>
                <li>Transmit viruses, malware, or other malicious code</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Use the Service for any illegal or unauthorized purpose</li>
              </ul>
            </section>

            {/* User Content */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. User Content</h2>
              
              <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">5.1 Your Content</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You retain ownership of all content you create, upload, or generate using our Service ("User Content"). By using our Service, you grant us a limited, non-exclusive, royalty-free license to process, store, and display your User Content solely for the purpose of providing the Service to you.
              </p>

              <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">5.2 AI-Generated Content</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Content generated by our AI tools is provided for informational and assistive purposes. You are responsible for:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li>Reviewing and verifying all AI-generated content before use</li>
                <li>Ensuring accuracy of medical, scientific, and academic information</li>
                <li>Complying with your institution's policies on AI-assisted work</li>
                <li>Properly citing and attributing sources as required</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">5.3 Content Restrictions</h3>
              <p className="text-gray-600 dark:text-gray-300">
                You may not upload or generate content that is illegal, defamatory, obscene, threatening, invasive of privacy, or otherwise objectionable. We reserve the right to remove any content that violates these Terms.
              </p>
            </section>

            {/* Intellectual Property */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Intellectual Property</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                The Service and its original content (excluding User Content), features, and functionality are owned by {companyName} and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                Our trademarks, logos, and service marks may not be used in connection with any product or service without our prior written consent.
              </p>
            </section>

            {/* Subscriptions and Payments */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Subscriptions and Payments</h2>
              
              <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">7.1 Free and Paid Plans</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We offer both free and paid subscription plans. Free plans have usage limitations. Paid plans provide additional features and higher usage limits.
              </p>

              <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">7.2 Billing</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2 mb-4">
                <li>Subscription fees are billed in advance on a monthly or annual basis</li>
                <li>All fees are non-refundable unless otherwise stated</li>
                <li>We may change subscription fees with 30 days' notice</li>
                <li>You are responsible for all applicable taxes</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">7.3 Cancellation</h3>
              <p className="text-gray-600 dark:text-gray-300">
                You may cancel your subscription at any time. Cancellation will take effect at the end of your current billing period. You will retain access to paid features until the end of your billing period.
              </p>
            </section>

            {/* Disclaimers */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. Disclaimers</h2>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">Medical Disclaimer</h3>
                <p className="text-yellow-700 dark:text-yellow-300">
                  THE SERVICE IS NOT INTENDED TO PROVIDE MEDICAL ADVICE, DIAGNOSIS, OR TREATMENT. AI-generated content should not be used as a substitute for professional medical judgment. Always consult qualified healthcare professionals for medical decisions.
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">General Disclaimer</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE.
                </p>
              </div>
            </section>

            {/* Limitation of Liability */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. Limitation of Liability</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, {companyName.toUpperCase()} AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li>Loss of profits, data, or goodwill</li>
                <li>Service interruption or computer damage</li>
                <li>Cost of substitute services</li>
                <li>Any damages arising from your use of or inability to use the Service</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 mt-4">
                OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            {/* Indemnification */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. Indemnification</h2>
              <p className="text-gray-600 dark:text-gray-300">
                You agree to indemnify, defend, and hold harmless {companyName} and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or in any way connected with your access to or use of the Service, your User Content, or your violation of these Terms.
              </p>
            </section>

            {/* Third-Party Services */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">11. Third-Party Services</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Our Service may contain links to or integrate with third-party websites, services, or content. We are not responsible for:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li>The content, accuracy, or practices of third-party services</li>
                <li>Any damage or loss caused by your use of third-party services</li>
                <li>The privacy practices of third-party services</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 mt-4">
                Your use of third-party services is governed by their respective terms and policies.
              </p>
            </section>

            {/* Termination */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">12. Termination</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li>Violation of these Terms</li>
                <li>Fraudulent, abusive, or illegal activity</li>
                <li>Non-payment of fees</li>
                <li>Extended periods of inactivity</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 mt-4">
                Upon termination, your right to use the Service will immediately cease. You may request a copy of your data before termination by contacting {supportEmail}.
              </p>
            </section>

            {/* Governing Law */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">13. Governing Law and Dispute Resolution</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                Any disputes arising from these Terms or your use of the Service shall first be attempted to be resolved through good-faith negotiation. If negotiation fails, disputes shall be resolved through binding arbitration in accordance with applicable arbitration rules.
              </p>
            </section>

            {/* Severability */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">14. Severability</h2>
              <p className="text-gray-600 dark:text-gray-300">
                If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
              </p>
            </section>

            {/* Entire Agreement */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">15. Entire Agreement</h2>
              <p className="text-gray-600 dark:text-gray-300">
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and {companyName} regarding your use of the Service and supersede all prior agreements and understandings.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">16. Contact Us</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                If you have any questions about these Terms, please contact us:
              </p>
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                <p className="text-gray-700 dark:text-gray-200"><strong>{companyName}</strong></p>
                <p className="text-gray-600 dark:text-gray-300">Legal Inquiries: {contactEmail}</p>
                <p className="text-gray-600 dark:text-gray-300">Support: {supportEmail}</p>
                <p className="text-gray-600 dark:text-gray-300">Website: {websiteUrl}</p>
              </div>
            </section>
          </div>
        </article>

        {/* Footer Links */}
        <div className="mt-8 text-center">
          <Link href="/privacy" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 mr-6">
            Privacy Policy
          </Link>
          <Link href="/" className="text-gray-600 hover:text-gray-700 dark:text-gray-400">
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
