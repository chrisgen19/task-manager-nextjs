import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Task Manager Pro",
};

export default function TermsOfService() {
  return (
    <div
      className="min-h-screen flex items-start justify-center px-4 py-16"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <article className="w-full max-w-2xl space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs mb-4"
          style={{ color: "var(--text-tertiary)" }}
        >
          &larr; Back to app
        </Link>

        <h1 className="text-xl font-bold">Terms of Service</h1>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Last updated: March 16, 2026
        </p>

        <section className="space-y-3 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing and using Task Manager Pro, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service.
          </p>

          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            2. Description of Service
          </h2>
          <p>
            Task Manager Pro is a web-based task management application that allows you to create, organize, and track tasks across workboards. The service includes features such as task creation, kanban boards, calendar views, file attachments, and third-party integrations.
          </p>

          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            3. User Accounts
          </h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information during registration and to keep your account information up to date. You are responsible for all activity that occurs under your account.
          </p>

          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            4. Acceptable Use
          </h2>
          <p>
            You agree not to use the service to upload malicious content, violate any applicable laws, attempt to gain unauthorized access to the service or its systems, or interfere with other users&apos; use of the service.
          </p>

          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            5. Third-Party Integrations
          </h2>
          <p>
            The service may integrate with third-party services such as Atlassian Jira. Your use of these integrations is subject to the respective third party&apos;s terms of service. We are not responsible for the availability or functionality of third-party services.
          </p>

          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            6. Intellectual Property
          </h2>
          <p>
            You retain ownership of all content you create within the service. By using the service, you grant us a limited license to store, process, and display your content as necessary to provide the service.
          </p>

          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            7. Limitation of Liability
          </h2>
          <p>
            The service is provided &quot;as is&quot; without warranties of any kind, express or implied. We shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.
          </p>

          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            8. Termination
          </h2>
          <p>
            We reserve the right to suspend or terminate your access to the service at any time for violation of these terms. You may delete your account at any time, which will permanently remove all your data from the service.
          </p>

          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            9. Changes to Terms
          </h2>
          <p>
            We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the updated terms.
          </p>

          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            10. Contact
          </h2>
          <p>
            If you have questions about these terms, contact us at the email address associated with the application administrator.
          </p>
        </section>
      </article>
    </div>
  );
}
