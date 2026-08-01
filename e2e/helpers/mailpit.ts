type MailpitMessageSummary = {
  ID: string;
  To: Array<{ Address: string }>;
  Subject: string;
};

type MailpitMessage = {
  ID: string;
  Text: string;
  HTML: string;
};

const MAILPIT_API =
  process.env.MAILPIT_API_URL ?? "http://127.0.0.1:54324/api/v1";

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Poll Mailpit until a message for the recipient appears, then return its body. */
export async function waitForMailpitMessage(
  recipientEmail: string,
  options?: { timeoutMs?: number },
): Promise<MailpitMessage> {
  const timeoutMs = options?.timeoutMs ?? 20_000;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const listResponse = await fetch(`${MAILPIT_API}/messages`);
    if (!listResponse.ok) {
      throw new Error(`Mailpit list failed: ${listResponse.status}`);
    }

    const listJson = (await listResponse.json()) as {
      messages: MailpitMessageSummary[];
    };

    const match = listJson.messages.find((message) =>
      message.To.some(
        (to) => to.Address.toLowerCase() === recipientEmail.toLowerCase(),
      ),
    );

    if (match !== undefined) {
      const detailResponse = await fetch(`${MAILPIT_API}/message/${match.ID}`);
      if (!detailResponse.ok) {
        throw new Error(`Mailpit detail failed: ${detailResponse.status}`);
      }
      return (await detailResponse.json()) as MailpitMessage;
    }

    await sleep(250);
  }

  throw new Error(`Timed out waiting for Mailpit message to ${recipientEmail}`);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

/**
 * Extract a navigation target for confirmation.
 * Prefers the app callback (`/auth/confirm?...`); falls back to Supabase
 * `/auth/v1/verify?...` which redirects to the app with a PKCE `code`.
 */
export function extractConfirmNavigationTarget(
  message: MailpitMessage,
): string {
  const haystack = decodeHtmlEntities(`${message.Text}\n${message.HTML}`);
  const patterns = [
    /https?:\/\/[^\s"'<>]+\/auth\/confirm\?[^\s"'<>]+/i,
    /\/auth\/confirm\?[^\s"'<>]+/i,
    /https?:\/\/[^\s"'<>]+\/auth\/v1\/verify\?[^\s"'<>]+/i,
  ];

  for (const pattern of patterns) {
    const match = haystack.match(pattern);
    if (match?.[0] !== undefined) {
      const raw = match[0];
      if (raw.startsWith("http")) {
        return raw;
      }
      return raw.startsWith("/") ? raw : `/${raw}`;
    }
  }

  throw new Error("Confirmation link not found in Mailpit message");
}

/** @deprecated Use extractConfirmNavigationTarget */
export function extractConfirmPath(message: MailpitMessage): string {
  return extractConfirmNavigationTarget(message);
}
