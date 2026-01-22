import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BTC Price Predictor",
  description: "Real-time Bitcoin analysis with TA, FA, sentiment analysis",
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
