import type { Metadata } from "next";
import { Sora, Figtree } from "next/font/google";
import "./globals.css";

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
        {/* Fixed bottom-right on wider screens; on phones it follows the page so it never covers the card */}
        <a
          href="https://github.com/priyamwada15/the-intelligencer"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-6 ml-auto mr-6 block w-fit md:fixed md:bottom-6 md:right-6 md:z-10 md:m-0 font-figtree text-[14px] font-normal text-text-secondary transition-colors duration-200 ease-out hover:text-link-hover"
        >
          GitHub
        </a>
      </body>
    </html>
  );
}
