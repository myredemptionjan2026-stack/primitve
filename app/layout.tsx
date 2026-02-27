import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Primitive — Discover. Test. Document.",
  description:
    "AI-powered integration discovery, testing, and spec generation for semi-technical teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
