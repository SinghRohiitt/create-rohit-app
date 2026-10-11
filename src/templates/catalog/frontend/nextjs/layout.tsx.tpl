import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "{{projectName}}",
  description: "A Next.js application generated with create-rohitsingh0408-app.",
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
