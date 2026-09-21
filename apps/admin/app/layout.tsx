import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "BOB Admin", template: "%s | BOB Admin" },
  description: "Secure administration portal for BOB.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
