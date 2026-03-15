export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-primary)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--status-todo)", color: "var(--accent-contrast)" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="2" y="2" width="12" height="12" rx="2" />
                <line x1="5" y1="6" x2="11" y2="6" />
                <line x1="5" y1="9" x2="9" y2="9" />
              </svg>
            </div>
            <span className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Task Manager Pro</span>
          </div>
        </div>
        <div className="rounded-xl p-8 shadow-2xl" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
