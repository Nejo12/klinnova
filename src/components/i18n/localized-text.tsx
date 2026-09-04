"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

export function LocalizedText({ message }: { message: MessageKey }) {
  const { t } = useLocale();
  return <>{t(message)}</>;
}
