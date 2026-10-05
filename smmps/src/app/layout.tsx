import type { Metadata } from "next";
import "./globals.css";
import { ConditionalHeader } from "@/components/ConditionalHeader";
import { ConditionalFooter } from "@/components/ConditionalFooter";
import { SYSTEM_NAME, SYSTEM_SHORT, MMPS_SUPPORT_EMAIL } from "@/lib/home-content";
import { LanguageProvider } from "@/lib/language-context";
import { AuthTabBoot } from "@/components/auth/AuthTabBoot";
import { AUTH_TAB_BOOT_SCRIPT } from "@/lib/auth-tab";

export const metadata: Metadata = {
  title: {
    default: `${SYSTEM_SHORT} — ${SYSTEM_NAME}`,
    template: `%s | ${SYSTEM_SHORT}`,
  },
  description:
    "Real-time market prices for Xoolaha, Korontada, and Biyaha in Mogadishu, Somalia.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
    apple: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="min-h-full overscroll-none bg-[#0f2744]"
    >
      <body className="flex min-h-dvh flex-col overflow-x-clip overscroll-none font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: AUTH_TAB_BOOT_SCRIPT }} />
        <AuthTabBoot />
        <LanguageProvider initialLang="en">
          <ConditionalHeader />
          <main className="flex min-h-0 flex-1 flex-col">{children}</main>
          <ConditionalFooter supportEmail={MMPS_SUPPORT_EMAIL} />
        </LanguageProvider>
      </body>
    </html>
  );
}
