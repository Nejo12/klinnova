/** Splits on blank lines into paragraphs; never touches markup. Rendered
 * with CSS `white-space: pre-line` so single line breaks inside a paragraph
 * still show without needing `<br/>` or HTML parsing. */
export function splitDescriptionParagraphs(description: string): string[] {
  return description
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}
