import type { Metadata } from "next";
import { Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { Mounted } from "@/components/shared/mounted";

/** Bangla letters join (শ্র, ক্ষ), so the screens, print pages and downloads need a real Bangla font. */
const bengali = Noto_Sans_Bengali({subsets: ["bengali", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-bengali", display: "swap"});

export const metadata: Metadata = {title: "RentFlow | Operations", description: "Rental agreements, money and month-end checks", icons: {icon: "/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en" className={bengali.variable} suppressHydrationWarning><body><Mounted>{children}</Mounted></body></html>}
