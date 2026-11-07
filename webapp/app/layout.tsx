import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "FireBack — detect the scam, then fire back",
  description:
    "FireBack is the Digital Security Assistant for consumers and small businesses: one clear next step — plus a one-tap fire back into the Finnish sales economy.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
      <Nav />
      {children}
    </body>
    </html>
  );
}
