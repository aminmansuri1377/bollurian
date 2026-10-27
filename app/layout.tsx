import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const peyda = localFont({
  src: [
    { path: "../public/font/peyda-light.ttf", weight: "300", style: "normal" },
    { path: "../public/font/Peyda-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/font/Peyda-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/font/Peyda-Bold.ttf", weight: "700", style: "normal" },
    { path: "../public/font/Peyda-Black.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-peyda",
  display: "swap",
  fallback: ["Tahoma", "Arial"],
});

export const metadata: Metadata = {
  title: "بلوریان | لیست قیمت آسانسور",
  description: "نرم‌افزار آفلاین محاسبه و صدور لیست قیمت آسانسور بلوریان",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={peyda.variable}>
      <body className="min-w-[1154px] bg-white font-sans text-brand antialiased selection:bg-lavender print:min-w-0 print:[print-color-adjust:exact] print:[-webkit-print-color-adjust:exact]">
        {children}
      </body>
    </html>
  );
}
