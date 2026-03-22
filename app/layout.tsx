import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import HeaderAuth from "@/components/HeaderAuth";

export const metadata: Metadata = {
  title: "Classendo",
  description: "Interactive learning",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {/* GLOBAL HEADER — THIS WAS MISSING */}
          <header className="p-4 border-b flex justify-end">
            <HeaderAuth />
          </header>

          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
