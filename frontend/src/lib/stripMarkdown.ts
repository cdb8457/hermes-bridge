/**
 * Strip markdown syntax before passing text to SpeechSynthesis.
 * Goal: readable spoken output, not raw markdown symbols.
 */
export function stripMarkdown(text: string): string {
  return text
    // Remove fenced code blocks entirely — don't read raw code
    .replace(/```[\s\S]*?```/g, ' (code block omitted) ')
    // Inline code — just read the content
    .replace(/`([^`]+)`/g, '$1')
    // Headings — keep text, remove #
    .replace(/^#{1,6}\s+/gm, '')
    // Bold + italic
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    // Links — keep link text, drop URL
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Images — omit
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' (image) ')
    // Blockquotes
    .replace(/^>\s*/gm, '')
    // Horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Unordered list bullets
    .replace(/^[\s]*[-*+]\s+/gm, '')
    // Ordered list numbers
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // HTML tags
    .replace(/<[^>]+>/g, '')
    // Multiple blank lines → single pause
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
