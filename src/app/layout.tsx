import type { Metadata } from "next";
import type { ReactNode } from "react";

import { LocaleBootstrapScript } from "@/components/i18n/locale-bootstrap-script";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { FloatingInterfacePreferences } from "@/components/theme/floating-appearance-control";
import { ThemeBootstrapScript } from "@/components/theme/theme-bootstrap-script";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { assertServerEnv } from "@/lib/env/server";
import "@/styles/tokens.css";
import "@/styles/pulse.css";
import "@/styles/globals.scss";

assertServerEnv();

export const metadata: Metadata = {
  title: "Klinnova",
  description: "Connecting candidates and employers in Berlin.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <LocaleBootstrapScript />
        <ThemeBootstrapScript />
      </head>
      <body>
        <LocaleProvider>
          <ThemeProvider>
            {children}
            <FloatingInterfacePreferences />
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
