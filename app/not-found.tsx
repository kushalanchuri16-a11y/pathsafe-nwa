import Link from "next/link";
import Header from "@/components/Header";
export const metadata = { title: "Page not found | PathSafe NWA" };
export default function NotFound() {
  return (
    <>
      <Header compact />
      <main id="main" className="method-page">
        <span className="eyebrow">404 / PAGE NOT FOUND</span>
        <h1>That page could not be found.</h1>
        <p>
          The link may have changed. Return home or open the route comparison.
        </p>
        <div className="hero-actions">
          <Link className="button" href="/">
            Return home
          </Link>
          <Link className="text-link" href="/app">
            Compare routes
          </Link>
        </div>
      </main>
    </>
  );
}
