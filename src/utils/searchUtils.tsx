/**
 * Search utilities for fuzzy matching and text processing
 */

/**
 * Strips HTML tags from text content
 * @param html - HTML string to strip tags from
 * @returns Plain text without HTML tags
 */
export const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  
  // Create a temporary div element to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Get text content and clean up extra whitespace
  return tempDiv.textContent || tempDiv.innerText || '';
};

/**
 * Creates a Fuse.js search query with exact and fuzzy matching
 * @param searchQuery - User's search input
 * @returns Fuse.js extended search query
 */
export const createFuseQuery = (searchQuery: string): string => {
  if (!searchQuery.trim()) return '';
  
  const words = searchQuery.trim().split(/\s+/);
  
  if (words.length === 1) {
    const word = words[0];
    // For single word: prioritize exact match, fallback to fuzzy
    return `='${word}' | ${word}`;
  }
  
  // For multiple words: all words must be present (exact or fuzzy)
  const wordQueries = words.map(word => `(='${word}' | ${word})`);
  return wordQueries.join(' ');
};

/**
 * Highlights search terms in text with word boundaries
 * @param text - Text to highlight
 * @param highlight - Search terms to highlight
 * @returns JSX element with highlighted text
 */
export const highlightSearchTerms = (text: string, highlight: string) => {
  if (!highlight.trim()) return text;

  // Strip HTML tags first
  const plainText = stripHtmlTags(text);
  
  const words = highlight.toLowerCase().trim().split(/\s+/);
  let highlightedText = plainText;

  words.forEach(word => {
    // Use word boundaries for exact matching
    const regex = new RegExp(`\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, "gi");
    highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>');
  });

  return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
};