import type { Metadata } from "next";
import type { ReactNode } from "react";

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
      <ThemeBootstrapScript />
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
