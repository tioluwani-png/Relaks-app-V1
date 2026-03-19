/**
 * Converts blog post content into properly formatted HTML.
 * Handles three cases:
 * 1. Content from TipTap editor (already proper HTML) — passed through
 * 2. Old content with <p> tags stuffed with <br> — split into proper paragraphs
 * 3. Plain text with \n line breaks — converted to HTML paragraphs
 *
 * Double line breaks = new paragraph, single line breaks = <br> within paragraph
 */
export function formatBlogContent(content: string): string {
  if (!content) return ''

  const trimmed = content.trim()

  // Case 1: Already has block-level HTML tags (from TipTap or properly formatted)
  if (/<(p|h[1-6]|div|ul|ol|blockquote|section|article|table|figure|hr)[\s>]/i.test(trimmed)) {
    // Fix legacy content: split <p> tags that have <br> stuffed inside them
    // into separate <p> tags so prose styles can add proper spacing
    return trimmed.replace(/<p>([\s\S]*?)<\/p>/gi, (_match, inner: string) => {
      // If this <p> contains <br> tags, split into multiple paragraphs
      if (/<br\s*\/?>/.test(inner)) {
        return inner
          .split(/<br\s*\/?>/)
          .map((line: string) => line.trim())
          .filter(Boolean)
          .map((line: string) => `<p>${line}</p>`)
          .join('\n')
      }
      return `<p>${inner}</p>`
    })
  }

  // Case 2: Plain text — convert to HTML paragraphs
  // Split by double line breaks (paragraph boundaries)
  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .filter(p => p.trim().length > 0)
    .map(p => {
      // Single line breaks within a paragraph become <br>
      const withLineBreaks = p.trim().replace(/\n/g, '<br>')
      return `<p>${withLineBreaks}</p>`
    })

  return paragraphs.join('\n')
}
