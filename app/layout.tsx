import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Youwe Annotate",
  description: "Visual UX annotation tool by Youwe Agency",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
