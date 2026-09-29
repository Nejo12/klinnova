/**
 * Provider-neutral presentation for Klinnova business mail. Text is supplied
 * separately by each message builder so the email remains useful without HTML.
 */
export type BusinessEmailPresentation = {
  heading: string;
  paragraphs: readonly string[];
  actionLabel: string;
  actionUrl: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export function renderBusinessEmailHtml({
  heading,
  paragraphs,
  actionLabel,
  actionUrl,
}: BusinessEmailPresentation): string {
  const safeUrl = escapeHtml(actionUrl);
  const body = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 18px;color:#4e4547;font-size:16px;line-height:1.5;">${escapeHtml(paragraph)}</p>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(heading)}</title></head>
  <body style="margin:0;padding:24px 12px;background:#f7f1e7;font-family:Arial,Helvetica,sans-serif;color:#211a1b;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d8d0c5;border-radius:14px;">
      <tr><td style="padding:32px 28px;">
        <p style="margin:0 0 28px;font-size:18px;line-height:1.4;font-weight:700;">Klinnova</p>
        <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;">${escapeHtml(heading)}</h1>
        ${body}
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0;"><tr><td bgcolor="#5f1824" style="background:#5f1824;border-radius:8px;"><a href="${safeUrl}" style="display:inline-block;padding:14px 20px;color:#ffffff;font-size:16px;line-height:1.3;font-weight:700;text-decoration:none;">${escapeHtml(actionLabel)}</a></td></tr></table>
        <p style="margin:0 0 8px;color:#4e4547;font-size:14px;line-height:1.5;">If the button doesn’t work, copy this address into your browser:</p>
        <p style="margin:0 0 28px;font-size:14px;line-height:1.5;overflow-wrap:anywhere;word-break:break-word;"><a href="${safeUrl}" style="color:#5f1824;text-decoration:underline;">${safeUrl}</a></p>
        <p style="margin:0;padding-top:20px;border-top:1px solid #d8d0c5;color:#4e4547;font-size:14px;line-height:1.5;">Need help? <a href="mailto:support@klinnova.com" style="color:#5f1824;">support@klinnova.com</a></p>
      </td></tr>
    </table>
  </body>
</html>`;
}
