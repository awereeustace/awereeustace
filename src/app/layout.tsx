import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OnBajet",
  description: "Budget-friendly travel deals and AI tools",
  icons: {
    icon: "data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%20100%20100'%3E%3Ctext%20y%3D'.9em'%20font-size%3D'90'%3E%F0%9F%92%B8%3C%2Ftext%3E%3C%2Fsvg%3E",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
