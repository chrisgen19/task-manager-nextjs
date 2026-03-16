import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Task Manager Pro",
};

export default function PrivacyPolicy() {
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

        <h1 className="text-xl font-bold">Privacy Policy</h1>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Last updated: March 16, 2026
        </p>

        <section className="space-y-3 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            1. Information We Collect
          </h2>
          <p>
            When you create an account, we collect your name, email address, and password (stored securely using bcrypt hashing). When you connect a third-party service such as Jira, we store encrypted OAuth tokens necessary to access your data on that service.
          </p>
          <p>
            We collect task data, workboard configurations, comments, and file attachments that you create within the application. Files are stored on Cloudflare R2.
          </p>

          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            2. How We Use Your Information
          </h2>
          <p>
            Your information is used solely to provide and improve the Task Manager Pro service. Specifically, we use it to authenticate your identity, display and manage your tasks and workboards, sync data from connected third-party services at your request, and store files you upload.
          </p>

          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            3. Third-Party Integrations
          </h2>
          <p>
            When you connect Jira, we request read-only access to your Jira issues and projects. OAuth tokens are encrypted at rest using AES-256-GCM. We only access your Jira data when you explicitly initiate a sync. You can disconnect Jira at any time from the Settings page, which deletes all stored tokens.
          </p>

          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            4. Data Storage and Security
          </h2>
          <p>
            All data is stored in a PostgreSQL database. Passwords are hashed with bcrypt. Third-party tokens are encrypted with AES-256-GCM. All connections use TLS in production. File uploads are stored on Cloudflare R2 with access controls.
          </p>

          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            5. Data Sharing
          </h2>
          <p>
            We do not sell, rent, or share your personal information with third parties. Data is only transmitted to third-party services (e.g., Atlassian/Jira) when you explicitly connect and sync.
          </p>

          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            6. Data Retention and Deletion
          </h2>
          <p>
            Your data is retained as long as your account is active. If you delete your account, all associated data — including tasks, workboards, comments, attachments, and third-party connections — is permanently deleted.
          </p>

          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            7. Your Rights
          </h2>
          <p>
            You have the right to access, correct, or delete your personal data at any time through the application settings. You can disconnect third-party integrations and remove synced data at any time.
          </p>

          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            8. Contact
          </h2>
          <p>
            If you have questions about this privacy policy, contact us at the email address associated with the application administrator.
          </p>
        </section>
      </article>
    </div>
  );
}
