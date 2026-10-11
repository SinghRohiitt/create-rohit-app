import "./globals.css";

export const metadata = {
  title: "{{projectName}}",
  description: "A Next.js application generated with create-rohitsingh0408-app.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
