import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pareidolator",
  description:
    "A browser-based pareidolia machine — quantum noise, phantom voices, emergent shapes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
