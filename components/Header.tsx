import Link from "next/link";
import { ArrowUpRight, Route } from "lucide-react";
export default function Header({ compact = false }: { compact?: boolean }) {
  return (
    <header className="header">
      <Link className="brand" href="/" aria-label="PathSafe NWA home">
        <span className="brand-icon">
          <Route size={22} />
        </span>
        PathSafe<span className="brand-region">NWA</span>
      </Link>
      {compact ? (
        <div className="header-meta">
          <span className="live-dot" />
          <span className="header-location">Bentonville, Arkansas</span>
          <Link className="mock-label" href="/methodology">
            METHODOLOGY
          </Link>
        </div>
      ) : (
        <nav aria-label="Main navigation">
          <Link href="/#how-it-works">How It Works</Link>
          <Link href="/#data">Data</Link>
          <Link href="/#about">About</Link>
          <Link className="button small" href="/app">
            Try PathSafe <ArrowUpRight size={16} />
          </Link>
        </nav>
      )}
    </header>
  );
}
