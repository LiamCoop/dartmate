import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DartMate - Real-time Darts Match",
  description: "Play real-time darts matches with friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}