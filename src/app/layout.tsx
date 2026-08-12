import type { Metadata } from "next";
import type { ReactNode } from "react";

import { assertServerEnv } from "@/lib/env/server";
import "@/styles/tokens.css";
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
