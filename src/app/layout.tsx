import type { Metadata } from "next";
import localFont from "next/font/local";
import { Dancing_Script, Fredoka, Nunito, Poppins } from "next/font/google";
import { event } from "@/lib/event";
import "./globals.css";

const highCruiser = localFont({
  src: "../fonts/HighCruiser.woff2",
  variable: "--font-high-cruiser",
  display: "swap",
});

const sweetApricot = localFont({
  src: "../fonts/SweetApricot.woff2",
  variable: "--font-sweet-apricot",
  display: "swap",
});

/** Fecha del sobre en Canva (Poppins Regular). */
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600"],
});

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
  metadataBase: new URL("https://kenya-birthday.vercel.app"),
  title: event.title,
  description: "Te invito a mi fiesta — 04.10.26",
  openGraph: {
    title: event.title,
    description: "Te invito a mi fiesta — 04.10.26",
    type: "website",
    locale: "es_SV",
    siteName: event.title,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${body.variable} ${display.variable} ${script.variable} ${highCruiser.variable} ${sweetApricot.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
