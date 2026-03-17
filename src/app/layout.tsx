import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Market Tracker",
  description:
    "Study project for practicing Cursor, BMAD, and Codex CLI while building a job market dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
