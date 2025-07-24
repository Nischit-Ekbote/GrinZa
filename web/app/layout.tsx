import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { WalletContextProvider } from "./provider/WalletProvider";
import '@solana/wallet-adapter-react-ui/styles.css';
import { FloatingDockBar } from "./components/ui/FloatingDock";
import { FloatingOrbs } from "./components/ui/Floating-orbs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Grinza - Capture Joy",
  description: "Capture and share your best smiles on the blockchain",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <Toaster richColors={true} />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WalletContextProvider>
          <div className="relative min-h-screen text-white overflow-hidden bg-black">

            <FloatingOrbs />

            {children}
          </div>
        </WalletContextProvider>
        <FloatingDockBar />
      </body>
    </html>
  );
}
