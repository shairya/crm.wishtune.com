import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const sandbox = process.env.NEXT_PUBLIC_APP_ENV === "sandbox";

export const metadata: Metadata = {
  title: sandbox ? "[SANDBOX] Wishtune CRM" : "Wishtune CRM",
  description: "Wishtune contacts and sales",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning // browser extensions (e.g. ColorZilla's cz-shortcut-listen) add attributes to <body>
        style={
          {
            "--font-sans": '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
            "--font-display": '"Cormorant Garamond", "Playfair Display", Georgia, serif',
          } as React.CSSProperties
        }
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
