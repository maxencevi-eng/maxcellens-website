/** Detect visible editor content, including media but excluding empty paragraphs. */
export function hasRichTextContent(html?: string | null): boolean {
  if (!html) return false;
  const content = html.replace(/<!--[\s\S]*?-->/g, "");
  if (/<(?:img|video|audio|iframe|hr)\b/i.test(content)) return true;
  return content
    .replace(/<[^>]*>/g, "")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => {
      const value = code.toLowerCase().startsWith("x")
        ? parseInt(code.slice(1), 16)
        : parseInt(code, 10);
      return value <= 0x10ffff ? String.fromCodePoint(value) : "";
    })
    .replace(/&(?:nbsp|ensp|emsp|thinsp|ZeroWidthSpace);/gi, " ")
    .replace(/[\s\u200b-\u200d\ufeff]/g, "").length > 0;
}
