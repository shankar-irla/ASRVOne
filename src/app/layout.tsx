import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASRVOne — Where curiosity becomes craft",
  description: "A learning and mentorship community for people ready to turn curiosity into craft.",
  applicationName: "ASRVOne",
};

export const viewport: Viewport = {
  themeColor: "#fffaf0",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head><link rel="stylesheet" href="/legacy/styles.css" /></head>
      <body>
        {children}
        <Script src="/legacy/app.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
