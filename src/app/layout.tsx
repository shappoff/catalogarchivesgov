import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import SkipToMainContent from "@/components/a11y/SkipToMainContent";
import GAAnalytics from "@/components/analytics/GAAnalytics";
import YandexMetrika from "@/components/analytics/YandexMetrika";
import {
  BELARUS_DESCRIPTION,
  BELARUS_TITLE,
  getSiteUrl,
} from "@/lib/site-metadata";
import "./globals.css";
import styles from "./layout.module.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = getSiteUrl();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: BELARUS_TITLE,
    template: "%s",
  },
  description: BELARUS_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    siteName: BELARUS_TITLE,
    title: BELARUS_TITLE,
    description: BELARUS_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: BELARUS_TITLE,
    description: BELARUS_DESCRIPTION,
  },
  verification: {
    google: "WcZLxrvNHupEwOXBZ_xza8RMaDFrJ_7Nc_Ax_vyo0zw",
    yandex: "cd605c554612fb41",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} ${styles.html}`}
    >
      <body className={styles.body}>
        <SkipToMainContent />
        <main id="main-content" className={styles.main} tabIndex={-1}>
          {children}
        </main>
        <GAAnalytics />
        <YandexMetrika />
      </body>
    </html>
  );
}
