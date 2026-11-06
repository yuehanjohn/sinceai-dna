import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "DNA Security Assistant",
  description:
    "Digital Security Assistant for consumers and small businesses — turn a worrying message, call or device event into one clear, proportionate next step.",
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
