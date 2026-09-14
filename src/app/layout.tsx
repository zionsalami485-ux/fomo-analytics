import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://trackr-ai-app.vercel.app"),

  title: "Trackr AI | Crypto Intelligence & Wallet Analytics",

  description:
    "Analyze wallets, track tokens, discover top holders, and uncover smarter crypto market insights with Trackr AI.",

  openGraph: {
    title: "Trackr AI | Crypto Intelligence & Wallet Analytics",
    description:
      "Analyze wallets, track tokens, discover top holders, and uncover smarter crypto market insights with Trackr AI.",
    url: "https://trackr-ai-app.vercel.app",
    siteName: "Trackr AI",
    images: [
      {
        url: "/trackr-preview.jpg",
        width: 1536,
        height: 1024,
        alt: "Trackr AI",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Trackr AI | Crypto Intelligence & Wallet Analytics",
    description:
      "Analyze wallets, track tokens, discover top holders, and uncover smarter crypto market insights with Trackr AI.",
    images: ["/trackr-preview.jpg"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
