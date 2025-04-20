import type { Metadata } from "next";
import "@/styles/globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers"; // Import the Providers component

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lens Account Interface", // Updated title
  description: "Manage your Lens Account", // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // If using SSR hydration, you would get initialState here from headers/cookies
  // const initialState = cookieToInitialState(...) etc.

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen`}>
        {/* Wrap children with Providers */}
        <Providers /*initialState={initialState}*/>{children}</Providers>
      </body>
    </html>
  );
}
