import type { Metadata } from "next";
import { Sora, Figtree } from "next/font/google";
import { DialRoot } from "dialkit";
import "dialkit/styles.css";
import "./globals.css";
import { DevPaddingDials } from "@/components/DevPaddingDials";

const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-sora",
});

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  title: "The Intelligencer",
  description: "A considered daily briefing on AI news.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${figtree.variable} font-sora antialiased`}>
        {children}
        <DevPaddingDials />
        <DialRoot />
      </body>
    </html>
  );
}
