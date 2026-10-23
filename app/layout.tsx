import type { Metadata, Viewport } from "next";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/manrope/latin-800.css";
import "leaflet/dist/leaflet.css";
import "./globals.css";
const siteTitle = "PathSafe NWA | Infrastructure-Aware Walking Routes";
const siteDescription =
  "Compare Bentonville walking routes using mapped pedestrian infrastructure coverage.";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000",
  ),
  title: siteTitle,
  description: siteDescription,
  applicationName: "PathSafe NWA",
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    locale: "en_US",
    siteName: "PathSafe NWA",
  },
  twitter: { card: "summary", title: siteTitle, description: siteDescription },
};
export const viewport: Viewport = {
  themeColor: "#19664f",
  colorScheme: "light",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
