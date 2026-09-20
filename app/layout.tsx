import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "../components/ui/Toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BIOVOLAILLES",
  description: "Plateforme de gestion et de traçabilité avicole BIOVOLAILLES.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-text">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
