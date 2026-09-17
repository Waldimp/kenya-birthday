import type { Metadata } from "next";
import { Dancing_Script, Fredoka, Nunito } from "next/font/google";
import "./globals.css";

const body = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const display = Fredoka({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const script = Dancing_Script({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Kenya’s 21 Birthday",
  description: "Te invito a mi fiesta — 04.10.26",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${body.variable} ${display.variable} ${script.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
